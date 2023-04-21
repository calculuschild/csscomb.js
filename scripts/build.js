const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

// Building source files
console.log('\n-----------------------\n Building source files\n-----------------------\n');

const srcDir = './src';
const libDir = './lib';

if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
}

function transpileDirectory(srcDir, libDir) {
    fs.readdirSync(srcDir).forEach(file => {
        const srcFile = path.join(srcDir, file);
        const libFile = path.join(libDir, file);
        if (fs.statSync(srcFile).isDirectory()) {
            if (!fs.existsSync(libFile)) {
                fs.mkdirSync(libFile);
            }
            transpileDirectory(srcFile, libFile);
        } else if (file.endsWith('.js')) {
            const code = fs.readFileSync(srcFile, 'utf8');
            const result = babel.transformSync(code, {
                plugins: ['@babel/plugin-transform-destructuring'],
            });
            fs.writeFileSync(libFile, result.code);
        }
    });
}

transpileDirectory(srcDir, libDir);
