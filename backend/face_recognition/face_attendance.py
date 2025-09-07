import face_recognition
import cv2
import numpy as np
import json
import os
import sqlite3
from datetime import datetime, date
import base64
from io import BytesIO
from PIL import Image
import pickle

class FaceAttendanceSystem:
    def __init__(self, db_path='../database/attendance.db'):
        """Initialize the face attendance system"""
        self.db_path = db_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.load_registered_faces()
        
    def connect_db(self):
        """Connect to SQLite database"""
        return sqlite3.connect(self.db_path)
    
    def load_registered_faces(self):
        """Load all registered faces from database"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT user_id, user_name, face_encoding FROM face_registrations")
        registrations = cursor.fetchall()
        
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        
        for reg in registrations:
            user_id, user_name, encoding_json = reg
            encoding = json.loads(encoding_json)
            
            self.known_face_encodings.append(np.array(encoding))
            self.known_face_names.append(user_name)
            self.known_face_ids.append(user_id)
        
        conn.close()
        print(f"Loaded {len(self.known_face_encodings)} registered faces")
    
    def register_face(self, image_path, user_id, user_name, user_type):
        """Register a new face in the system"""
        try:
            # Load image and get face encoding
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            
            if len(face_locations) == 0:
                return {"success": False, "error": "No face detected in the image"}
            
            if len(face_locations) > 1:
                return {"success": False, "error": "Multiple faces detected. Please upload an image with only one face"}
            
            face_encoding = face_recognition.face_encodings(image, face_locations)[0]
            
            # Save to database
            conn = self.connect_db()
            cursor = conn.cursor()
            
            encoding_json = json.dumps(face_encoding.tolist())
            
            cursor.execute("""
                INSERT OR REPLACE INTO face_registrations 
                (user_id, user_type, user_name, face_encoding, photo_path)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, user_type, user_name, encoding_json, image_path))
            
            conn.commit()
            conn.close()
            
            # Reload faces
            self.load_registered_faces()
            
            return {
                "success": True,
                "message": f"Face registered successfully for {user_name}",
                "user_id": user_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def recognize_face(self, image_path):
        """Recognize a face from an image"""
        try:
            # Load image
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            
            if len(face_locations) == 0:
                return {"success": False, "error": "No face detected"}
            
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            for face_encoding in face_encodings:
                # Compare with known faces
                matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=0.6)
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                
                if True in matches:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        return {
                            "success": True,
                            "user_id": self.known_face_ids[best_match_index],
                            "user_name": self.known_face_names[best_match_index],
                            "confidence": float(1 - face_distances[best_match_index])
                        }
            
            return {"success": False, "error": "Face not recognized"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def mark_attendance(self, image_path, location=None):
        """Mark attendance using face recognition"""
        # Recognize face
        result = self.recognize_face(image_path)
        
        if not result["success"]:
            return result
        
        user_id = result["user_id"]
        user_name = result["user_name"]
        
        # Check if already checked in today
        conn = self.connect_db()
        cursor = conn.cursor()
        
        today = date.today().isoformat()
        cursor.execute("""
            SELECT * FROM attendance_records 
            WHERE user_id = ? AND date = ?
        """, (user_id, today))
        
        existing_record = cursor.fetchone()
        
        if existing_record:
            # Already checked in, mark check-out
            if existing_record[6] is None:  # check_out_time is NULL
                cursor.execute("""
                    UPDATE attendance_records 
                    SET check_out_time = ?, check_out_photo = ?
                    WHERE user_id = ? AND date = ?
                """, (datetime.now().isoformat(), image_path, user_id, today))
                
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "action": "check_out",
                    "user_id": user_id,
                    "user_name": user_name,
                    "time": datetime.now().isoformat()
                }
            else:
                conn.close()
                return {
                    "success": False,
                    "error": "Already checked out for today"
                }
        else:
            # New check-in
            # Determine status based on time
            now = datetime.now()
            status = "present"
            
            # Check if late (after 9:15 AM)
            if now.hour > 9 or (now.hour == 9 and now.minute > 15):
                status = "late"
            
            # Check if half-day (after 1:00 PM)
            if now.hour >= 13:
                status = "half-day"
            
            # Get user type
            cursor.execute("SELECT user_type FROM face_registrations WHERE user_id = ?", (user_id,))
            user_type = cursor.fetchone()[0]
            
            cursor.execute("""
                INSERT INTO attendance_records 
                (user_id, user_type, user_name, date, check_in_time, status, location, check_in_photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, user_type, user_name, today, datetime.now().isoformat(), 
                  status, location, image_path))
            
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "action": "check_in",
                "user_id": user_id,
                "user_name": user_name,
                "status": status,
                "time": datetime.now().isoformat()
            }
    
    def capture_and_mark_attendance(self):
        """Capture face from webcam and mark attendance"""
        video_capture = cv2.VideoCapture(0)
        
        print("Press SPACE to capture face for attendance, ESC to exit")
        
        while True:
            ret, frame = video_capture.read()
            
            if not ret:
                break
            
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Find faces in frame
            face_locations = face_recognition.face_locations(rgb_frame)
            
            # Draw rectangles around faces
            for (top, right, bottom, left) in face_locations:
                cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            
            cv2.imshow('Face Attendance System', frame)
            
            key = cv2.waitKey(1)
            
            if key == ord(' '):  # Space key
                # Save current frame
                temp_path = f"temp_capture_{datetime.now().timestamp()}.jpg"
                cv2.imwrite(temp_path, frame)
                
                # Process attendance
                result = self.mark_attendance(temp_path)
                
                # Clean up temp file
                os.remove(temp_path)
                
                print(json.dumps(result, indent=2))
                
                if result["success"]:
                    break
            
            elif key == 27:  # ESC key
                break
        
        video_capture.release()
        cv2.destroyAllWindows()
    
    def get_attendance_report(self, start_date, end_date, user_type=None):
        """Generate attendance report for date range"""
        conn = self.connect_db()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                user_id,
                user_name,
                user_type,
                date,
                check_in_time,
                check_out_time,
                total_hours,
                status
            FROM attendance_records
            WHERE date BETWEEN ? AND ?
        """
        
        params = [start_date, end_date]
        
        if user_type:
            query += " AND user_type = ?"
            params.append(user_type)
        
        query += " ORDER BY date DESC, user_name"
        
        cursor.execute(query, params)
        records = cursor.fetchall()
        
        conn.close()
        
        return records
    
    def export_to_excel(self, records, output_path):
        """Export attendance records to Excel"""
        try:
            import pandas as pd
            
            df = pd.DataFrame(records, columns=[
                'User ID', 'Name', 'Type', 'Date', 
                'Check In', 'Check Out', 'Total Hours', 'Status'
            ])
            
            # Format datetime columns
            df['Date'] = pd.to_datetime(df['Date'])
            df['Check In'] = pd.to_datetime(df['Check In'])
            df['Check Out'] = pd.to_datetime(df['Check Out'])
            
            # Create Excel writer with xlsxwriter engine
            with pd.ExcelWriter(output_path, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Attendance Report', index=False)
                
                # Get workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets['Attendance Report']
                
                # Add formats
                header_format = workbook.add_format({
                    'bold': True,
                    'bg_color': '#667eea',
                    'font_color': 'white',
                    'border': 1
                })
                
                # Apply header format
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                
                # Auto-adjust column widths
                for i, col in enumerate(df.columns):
                    column_width = max(df[col].astype(str).map(len).max(), len(str(col))) + 2
                    worksheet.set_column(i, i, column_width)
            
            return {"success": True, "message": f"Report exported to {output_path}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# Example usage
if __name__ == "__main__":
    system = FaceAttendanceSystem()
    
    # Example: Register a face
    # result = system.register_face("john_photo.jpg", "EMP001", "John Doe", "employee")
    # print(result)
    
    # Example: Mark attendance from webcam
    # system.capture_and_mark_attendance()
    
    # Example: Generate report
    # records = system.get_attendance_report("2024-01-01", "2024-12-31")
    # system.export_to_excel(records, "attendance_report.xlsx")