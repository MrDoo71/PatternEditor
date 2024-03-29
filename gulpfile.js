// Initialize modules
// Importing specific gulp API functions lets us write them below as series() instead of gulp.series()
const { src, dest, watch, series, parallel } = require('gulp');
// Importing all the Gulp-related packages we want to use
const sourcemaps = require('gulp-sourcemaps');
//const sass = require('gulp-sass');
var order = require("gulp-order"); //JD
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const print = require('gulp-print').default;
var replace = require('gulp-replace');


// File paths
const files = { 
    scssPath: 'app/scss/**/*.scss',
    jsPath: 'scripts/**/*.js'
}

// Sass task: compiles the style.scss file into style.css
function scssTask(){    
    return src(files.scssPath)
        .pipe(sourcemaps.init()) // initialize sourcemaps first
        //.pipe(sass()) // compile SCSS to CSS
        .pipe(postcss([ autoprefixer(), cssnano() ])) // PostCSS plugins
        .pipe(sourcemaps.write('.')) // write sourcemaps file in current directory
        .pipe(dest('dist')
    ); // put final CSS in dist folder
}

// JS task: concatenates and uglifies JS files to script.js
function jsTask(){
    return src([
        files.jsPath
        ,'!' + 'scripts/kinodbglue*.js', // to exclude any specific files
        ])
        .pipe(sourcemaps.init()) // initialize sourcemaps first
        .pipe(order([ 
            //"nodefine.js",
            "Expression.js",
            "Geometry.js",
            "drawing/DrawingObject.js",
            "drawing/*.js",
            "Pattern.js",
            "Group.js",
            "Piece.js",
            "PatternDrawing.js",
            "PatternEditor.js",
            "*.js"
          ]))        
        .pipe(print(filepath => `built: ${filepath}`))
        .pipe(concat('patterneditor.js'))
        //.pipe(uglify())
        .pipe(sourcemaps.write('.')) // write sourcemaps file in current directory        
        .pipe(dest('dist')
    );
}

// Cachebust
var cbString = new Date().getTime();
function cacheBustTask(){
    return src(['index.html'])
        .pipe(replace(/cb=\d+/g, 'cb=' + cbString))
        .pipe(dest('.'));
}

// Watch task: watch SCSS and JS files for changes
// If any change, run scss and js tasks simultaneously
function watchTask(){
    watch([files.scssPath, files.jsPath], 
        series(
            parallel(scssTask, jsTask),
            cacheBustTask
        )
    );    
}

// Export the default Gulp task so it can be run
// Runs the scss and js tasks simultaneously
// then runs cacheBust, then watch task
exports.default = series(
    parallel(scssTask, jsTask), 
    cacheBustTask,
    watchTask
);

exports.jsTask = jsTask;