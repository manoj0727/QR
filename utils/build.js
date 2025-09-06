// Modern build script for optimizing the application
import fs from 'fs';
import path from 'path';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

class ModernBuilder {
    constructor() {
        this.srcDir = './src';
        this.publicDir = './public';
        this.distDir = './dist';
        this.cleanCSS = new CleanCSS();
    }

    async build() {
        console.log('🚀 Starting modern build process...');
        
        try {
            // Clean dist directory
            await this.cleanDist();
            
            // Copy public files
            await this.copyPublicFiles();
            
            // Bundle and minify JavaScript
            await this.bundleJavaScript();
            
            // Minify CSS
            await this.minifyCSS();
            
            // Generate service worker
            await this.generateServiceWorker();
            
            // Create production HTML
            await this.createProductionHTML();
            
            console.log('✅ Build completed successfully!');
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    async cleanDist() {
        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.distDir, { recursive: true });
        console.log('📁 Cleaned dist directory');
    }

    async copyPublicFiles() {
        const publicFiles = fs.readdirSync(this.publicDir);
        
        for (const file of publicFiles) {
            const srcPath = path.join(this.publicDir, file);
            const destPath = path.join(this.distDir, file);
            
            if (fs.statSync(srcPath).isFile() && !file.endsWith('.html')) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
        
        console.log('📋 Copied public files');
    }

    async bundleJavaScript() {
        const jsFiles = await this.getAllJSFiles(this.srcDir);
        let bundledCode = '';
        
        // Create a simple module bundler
        for (const filePath of jsFiles) {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(this.srcDir, filePath);
            
            // Convert ES6 imports/exports to a simple module system
            const processedContent = this.processModuleCode(content, relativePath);
            bundledCode += `\n// Module: ${relativePath}\n${processedContent}\n`;
        }
        
        // Add module loader
        const moduleLoader = this.createModuleLoader();
        bundledCode = moduleLoader + bundledCode;
        
        // Minify the bundled code
        const minified = await minify(bundledCode, {
            compress: {
                dead_code: true,
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug']
            },
            mangle: {
                toplevel: true
            },
            format: {
                comments: false
            }
        });
        
        fs.writeFileSync(path.join(this.distDir, 'app.min.js'), minified.code);
        console.log('📦 Bundled and minified JavaScript');
    }

    async getAllJSFiles(dir) {
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                files.push(...await this.getAllJSFiles(fullPath));
            } else if (entry.name.endsWith('.js')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    processModuleCode(content, filePath) {
        // Convert import statements
        content = content.replace(/import\s+{([^}]+)}\s+from\s+['"](.*?)['"];?/g, 
            (match, imports, path) => {
                return `const { ${imports} } = ModuleSystem.require('${path}');`;
            });
        
        content = content.replace(/import\s+(.*?)\s+from\s+['"](.*?)['"];?/g,
            (match, defaultImport, path) => {
                return `const ${defaultImport} = ModuleSystem.require('${path}');`;
            });
        
        // Convert export statements
        content = content.replace(/export\s+class\s+(\w+)/g, 'class $1');
        content = content.replace(/export\s+function\s+(\w+)/g, 'function $1');
        content = content.replace(/export\s+const\s+(\w+)/g, 'const $1');
        
        // Add module registration
        const moduleId = filePath.replace(/\\/g, '/');
        content += `\nModuleSystem.register('${moduleId}', { ${this.extractExports(content)} });`;
        
        return content;
    }

    extractExports(content) {
        const exports = [];
        const classMatches = content.match(/class\s+(\w+)/g);
        const functionMatches = content.match(/function\s+(\w+)/g);
        const constMatches = content.match(/const\s+(\w+)/g);
        
        if (classMatches) {
            classMatches.forEach(match => {
                const className = match.split(' ')[1];
                exports.push(className);
            });
        }
        
        if (functionMatches) {
            functionMatches.forEach(match => {
                const functionName = match.split(' ')[1];
                exports.push(functionName);
            });
        }
        
        return exports.join(', ');
    }

    createModuleLoader() {
        return `
            // Simple Module System
            window.ModuleSystem = {
                modules: new Map(),
                
                register(id, exports) {
                    this.modules.set(id, exports);
                },
                
                require(path) {
                    // Resolve relative paths
                    if (path.startsWith('./')) {
                        path = path.substring(2);
                    }
                    if (path.startsWith('../')) {
                        // Handle relative imports
                        path = path.replace('../', '');
                    }
                    
                    const module = this.modules.get(path);
                    if (!module) {
                        throw new Error(\`Module not found: \${path}\`);
                    }
                    
                    return module;
                }
            };
        `;
    }

    async minifyCSS() {
        const cssFiles = ['dashboard-modern.css', 'transaction-history.css'];
        let combinedCSS = '';
        
        for (const file of cssFiles) {
            const filePath = path.join(this.publicDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                combinedCSS += content + '\n';
            }
        }
        
        const minified = this.cleanCSS.minify(combinedCSS);
        fs.writeFileSync(path.join(this.distDir, 'styles.min.css'), minified.styles);
        console.log('🎨 Minified CSS');
    }

    async generateServiceWorker() {
        // Copy and update service worker with correct cache names
        const swContent = fs.readFileSync(path.join(this.publicDir, 'sw.js'), 'utf8');
        const updatedSW = swContent.replace(
            'qr-inventory-v1',
            `qr-inventory-v${Date.now()}`
        );
        
        fs.writeFileSync(path.join(this.distDir, 'sw.js'), updatedSW);
        console.log('⚙️ Generated service worker');
    }

    async createProductionHTML() {
        const htmlContent = fs.readFileSync(path.join(this.publicDir, 'index-modern.html'), 'utf8');
        
        // Replace references to individual files with bundled versions
        let productionHTML = htmlContent
            .replace(/src\/main\.js/g, 'app.min.js')
            .replace(/dashboard-modern\.css/g, 'styles.min.css')
            .replace(/transaction-history\.css/g, 'styles.min.css')
            .replace(/type="module"/g, '');
        
        // Inline critical CSS (first 1KB of CSS)
        const criticalCSS = fs.readFileSync(path.join(this.distDir, 'styles.min.css'), 'utf8')
            .substring(0, 1024);
        
        productionHTML = productionHTML.replace(
            '/* Critical above-the-fold styles */',
            criticalCSS
        );
        
        fs.writeFileSync(path.join(this.distDir, 'index.html'), productionHTML);
        console.log('📄 Created production HTML');
    }
}

// Run the build if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new ModernBuilder();
    builder.build();
}

export default ModernBuilder;