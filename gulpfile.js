// gulp
import gulp from 'gulp';
import gulpIf from 'gulp-if';
import browserSync from 'browser-sync';
import plumber from 'gulp-plumber';
import del from 'del';
import rename from 'gulp-rename';

// html
import htmlMin from 'gulp-htmlmin';

// css
import sass from 'sass';
import gulpSass from 'gulp-sass';

const scssToCss = gulpSass(sass);
import autoprefixer from 'gulp-autoprefixer';
import sourcemaps from 'gulp-sourcemaps';
import cleanCSS from 'gulp-clean-css';
import gcmq from 'gulp-group-css-media-queries';
import { stream as critical } from 'critical';

// js
import webpack from 'webpack-stream';
import terser from 'gulp-terser';

// images
import gulpImage from 'gulp-image';
import gulpWebp from 'gulp-webp';
import gulpAfiv from 'gulp-avif';


//server
let dev = false;

const path = {
    src: {
        base: 'src/',
        html: 'src/*.html',
        scss: 'src/scss/**/*.scss',
        js: 'src/js/index.js',
        img: 'src/img/**/*.{jpg,svg,jpeg,png,gif}',
        imgF: 'src/img/**/*.{jpg,jpeg,png}',
        assets: ['src/fonts/**/*.*', 'src/icons/**/*.*']
    },
    dist: {
        base: 'dist/',
        html: 'dist/',
        css: 'dist/css/',
        js: 'dist/js/',
        img: 'dist/img/'
    },
    watch: {
        html: 'src/*.html',
        scss: 'src/scss/**/*.scss',
        js: 'src/js/**/*.*',
        img: 'src/img/**/*.{jpg,svg,jpeg,png,gif}',
        imgF: 'src/img/**/*.{jpg,jpeg,png}',
        assets: ['src/fonts/**/*.*', 'src/icons/**/*.*']
    }
};

export const html = () => gulp
    .src(path.src.html)
    .pipe(gulpIf(!dev, htmlMin({
        removeComments: true,
        collapseWhitespace: true,
    })))
    .pipe(gulp.dest(path.dist.html))
    .pipe(browserSync.stream());

export const scss = () => gulp
    .src(path.src.scss)
    .pipe(gulpIf(dev, sourcemaps.init()))
    .pipe(scssToCss().on('error', scssToCss.logError))
    .pipe(gulpIf(!dev, autoprefixer(({
        cascade: false,
    }))))
    .pipe(gulpIf(!dev, gcmq()))
    .pipe(gulpIf(!dev, gulp.dest(path.dist.css)))
    .pipe(gulpIf(!dev, cleanCSS({
        2: {
            specialComments: 0,
        }
    })))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulpIf(dev, sourcemaps.write()))
    .pipe(gulp.dest(path.dist.css))
    .pipe(browserSync.stream());

const configWebpack = {
    mode: dev ? 'development' : 'production',
    devtool: dev ? 'eval-source-map' : false,
    optimization: {
        minimize: false,
    },
    output: {
        filename: 'index.js'
    },
    module: {
        rules: []
    }
};

if (!dev) {
    configWebpack.module.rules.push({
        test: /\.(js)$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime']
        }
    })
}

export const js = () => gulp
    .src(path.src.js)
    .pipe(plumber())
    .pipe(webpack(configWebpack))
    .pipe(gulpIf(!dev, gulp.dest(path.dist.js)))
    .pipe(gulpIf(!dev, terser()))
    .pipe(rename({
        'suffix': '.min',
    }))
    .pipe(gulpIf(!dev, gulp.dest(path.dist.js)))
    .pipe(gulp.dest(path.dist.js))
    .pipe(browserSync.stream());

const image = () => gulp
    .src(path.src.img)
    .pipe(gulpIf(!dev, gulpImage({
        optipng: ['-i 1', '-strip all', '-fix', '-o7', '-force'],
        pngquant: ['--speed=1', '--force', 256],
        zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
        jpegRecompress: ['--strip', '--quality', 'medium', '--min', 40, '--max', 80],
        mozjpeg: ['-optimize', '-progressive'],
        gifsicle: ['--optimize'],
        svgo: ['--enable', 'cleanupIDs', '--disable', 'convertColors']
    })))
    .pipe(gulp.dest(path.dist.img))
    .pipe(browserSync.stream({
        once: true,
    }));

const webp = () => gulp
    .src(path.src.imgF)
    .pipe(gulpWebp({
        quality: dev ? 100 : 70
    }))
    .pipe(gulp.dest(path.dist.img))
    .pipe(browserSync.stream({
        once: true,
    }));

const avif = () => gulp
    .src(path.src.imgF)
    .pipe(gulpAfiv({
        quality: dev ? 100 : 50
    }))
    .pipe(gulp.dest(path.dist.img))
    .pipe(browserSync.stream({
        once: true,
    }));


const copy = () => gulp
    .src(path.src.assets, {
        base: path.dist.base,
    })
    .pipe(gulp.dest(path.dist.base))
    .pipe(browserSync.stream({
        once: true,
    }));


export const server = () => {
    browserSync.init({
        ui: false,
        notify: false,
        host: 'localhost',
        //tunnel: true,
        server: {
            baseDir: path.dist.base,
        }
    });

    gulp.watch(path.watch.html, html);
    gulp.watch(path.watch.scss, scss);
    gulp.watch(path.watch.js, js);
    gulp.watch(path.watch.img, image);
    gulp.watch(path.watch.imgF, webp);
    gulp.watch(path.watch.imgF, avif);
    gulp.watch(path.watch.assets, copy);
};

const clear = () => del(path.dist.base);

const develop = (ready) => {
    dev = true;
    ready();
};

export const base = gulp.parallel(html, scss, js, image, avif, webp, copy);

export const build = gulp.series(clear, base);

export default gulp.series(develop, base, server);
