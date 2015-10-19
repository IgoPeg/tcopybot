module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                globals: {
                    jQuery: true
                }
            }
        },
        uglify: {
            options: {
                //banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                quoteStyle: 1
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'build/uglify.js'
            }
        },
        jsObfuscate: {
            test: {
                options: {
                    concurrency: 2,
                    keepLinefeeds: false,
                    keepIndentations: false,
                    encodeStrings: true,
                    encodeNumbers: true,
                    moveStrings: true,
                    replaceNames: true,
                    variableExclusions: [ '^_get_', '^_set_', '^_mtd_' ]
                },
                files: {
                    'build/min.js': [
                        'build/uglify.js'
                    ],
                    'build/trackingbot.js': [
                        'src/trackingbot.js'
                    ]
                }
            }
        },
        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: 'JS_CODE',
                            replacement: function(match) {
                                return grunt.file.read('build/min.js');
                            }
                        },
                        {
                            match: 'JS_VERSION',
                            replacement: function(match) {
                                return grunt.file.readJSON('package.json').version||0;
                            }
                        },
                        {
                            match: 'QS_JS_CODE',
                            replacement: function(match) {
                                return grunt.file.read('src/qsiqbot.js');
                            }
                        },
                        {
                            match: 'DATA1',
                            replacement: function(match) {
                                return grunt.file.read('data1');
                            }
                        }
                        //,
                        //{
                        //    match: 'DATA2',
                        //    replacement: function(match) {
                        //        return grunt.file.read('data2');
                        //    }
                        //},
                        //{
                        //    match: 'DATA3',
                        //    replacement: function(match) {
                        //        return grunt.file.read('data3');
                        //    }
                        //},
                        //{
                        //    match: 'DATA4',
                        //    replacement: function(match) {
                        //        return grunt.file.read('data4');
                        //    }
                        //},
                        //{
                        //    match: 'DATA5',
                        //    replacement: function(match) {
                        //        return grunt.file.read('data5');
                        //    }
                        //}
                    ]
                },
                files: [
                    {expand: true, flatten: true, src: ['index.html','testing.html'], dest: 'build/'}
                ]
            }
        },
        watch: {
            files: ['<%= jshint.files %>', '*.html','data*'],
            tasks: ['default']
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-replace');
    //https://www.npmjs.com/package/js-obfuscator
    grunt.loadNpmTasks('js-obfuscator');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'uglify', 'jsObfuscate', 'replace']);

};