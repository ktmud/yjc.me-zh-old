var BatchStream = require('batch-stream2')
var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()
var sourcemaps = require('gulp-sourcemaps')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var source = require('vinyl-source-stream')
var gutil = require('gulp-util')

var sourcedir = 'src'
var src = {
  bower: ['bower.json', '.bowerrc'],
  styles: [sourcedir + '/styles/**/*.+(css|scss)'],
  scripts: [sourcedir + '/scripts/**/*.+(js|coffee)'],
  // The entry point of a browserify bundle
  // add as many bundles as you wish
  main: sourcedir + '/scripts/app.coffee',
}
var dist = {
  all: ['dist/**/*'],
  assets: 'static/assets'
}
var debug = true

var mainBowerFiles = require('main-bower-files')();

//
// concat *.js to `vendor.js`
// and *.css to `vendor.css`
// rename fonts to `fonts/*.*`
//
gulp.task('bower-js', function() {
  return gulp.src(mainBowerFiles)
    .pipe(plugins.filter('**/*.js'))
    .pipe(plugins.concat('vendor.js')) // bower components js goes to vendor.js
    .pipe(gulp.dest(dist.assets + '/js'))
});
gulp.task('bower-css', function() {
  return gulp.src(mainBowerFiles)
    .pipe(plugins.filter('**/*.css'))
    .pipe(plugins.concat('vendor.css')) // css goes to vendor.css
    .pipe(gulp.dest(dist.assets + '/css'))
});
gulp.task('bower-other', function() {
  // all other files go to another directory
  return gulp.src(mainBowerFiles)
    .pipe(plugins.filter(['*', '!*.js', '!*.css']))
    .pipe(plugins.rename(function(path) {
      if (~path.basename.indexOf('glyphicons')) {
        path.dirname += '/fonts'
      }
    }))
    .pipe(gulp.dest(dist.assets))
});

gulp.task('css', ['bower-css'], function buildCSS() {
  // all css goes to one file
  return gulp.src(src.styles)
    .pipe(plugins.plumber())
    .pipe(plugins.sass({
      sourceComments: debug ? 'map' : false
    }))
    .pipe(plugins.concat('app.css'))
    .pipe(gulp.dest(dist.assets + '/css'))
})

gulp.task('js', ['bower-js'], function buildJS() {
  return browserify({
      entries: [src.main],
      extensions: ['.coffee', '.js'],
      transform: ['coffeeify'],
      debug: debug
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
      .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dist.assets + '/js'))
})

gulp.task('watch', ['css', 'js'], function() {
  gulp.watch(src.bower, ['bower-css', 'bower-js', 'bower-other'])
  gulp.watch(src.styles, ['css'])
  gulp.watch(src.scripts, ['js'])
})
//
// live reload can emit changes only when at lease one build is done
//
gulp.task('live', ['watch'], function() {
	var server = plugins.livereload()
	// in case a lot of files changed during a short time
	var batch = new BatchStream({ timeout: 50 })
	gulp.watch(dist.all).on('change', function change(file) {
		// clear directories
		var urlpath = file.path.replace(__dirname + '/static', '')
		// also clear the tailing index.html
		// so we can notify livereload.js the right path of files changed
		urlpath = urlpath.replace('/index.html', '/')
		batch.write(urlpath)
	})
	batch.on('data', function(files) {
		server.changed(files.join(','))
	})
})

gulp.task('compress-css', ['css'], function() {
  return gulp.src(dist.assets + '/**/*.css')
    .pipe(plugins.cssnano())
    .pipe(gulp.dest(dist.assets))
})

gulp.task('compress-js', ['js'], function() {
  return gulp.src(dist.assets + '/**/*.js')
    .pipe(plugins.uglify())
    .pipe(gulp.dest(dist.assets))
})

gulp.task('no-debug', ['bower-other'], function() {
  // set debug to false,
  // then browserify will not output sourcemap
  debug = false
})

// build for production
gulp.task('compress', ['compress-css', 'compress-js'])
gulp.task('build', ['no-debug', 'compress'])

// default task is build
gulp.task('default', ['build'])
