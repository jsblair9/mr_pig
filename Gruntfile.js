module.exports = function(grunt) {
  // Load all grunt tasks.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);


  // Load the config files.
  var mrpig = grunt.file.readYAML('mr_pig/mr_pig.yaml');

  if (grunt.file.exists('mr_pig/mr_pig.preferences.yaml')) {
    var mrpigPrefs = grunt.file.readYAML('mr_pig/mr_pig.preferences.yaml');

  } else {
    var mrpigPrefs = {};

    // Inform user that they can tweak some preferences.
    grunt.log.subhead('Mr. Pig');
    grunt.log.writeln('-------');
    grunt.log.writeln(
      'You can set personal preferences for things like which browser to use during development ' +
      'in `mr_pig/mr_pig.preferences.yaml`. See `mr_pig/mr_pig.preferences.yaml.sample`.'
    );
  }


  // Set default preferences.
  mrpig['browser']   = 'Google Chrome Canary';
  mrpig['local_url'] = 'http://localhost:8080';

  // Set empty values for potentially absent options.
  mrpig['ssh']         = {};
  mrpig['ssh']['user'] = '';
  mrpig['ssh']['host'] = '';

  // Overwrite default preferences.
  mrpig = mergeObjects(mrpig, mrpigPrefs);


  // Build task lists.
  var buildTasks      = [];
  var concurrentTasks = [];

  addToTaskList('copy:app',         mrpig.enable.copy,        buildTasks);
  addToTaskList('copy:theme',       mrpig.enable.copy,        buildTasks);
  addToTaskList('copy:misc',        mrpig.enable.copy,        buildTasks);
  addToTaskList('copy:picturefill', mrpig.enable.picturefill, buildTasks);
  addToTaskList(
    'useminPrepare',
    mrpig.enable.usemin.js || mrpig.enable.usemin.css,
    buildTasks
  );
  addToTaskList('concat:generated', mrpig.enable.usemin.js,   buildTasks);
  addToTaskList('uglify:generated', mrpig.enable.usemin.js,   buildTasks);
  addToTaskList('cssmin:generated', mrpig.enable.usemin.css,  buildTasks);
  addToTaskList(
    'usemin',
    mrpig.enable.usemin.js || mrpig.enable.usemin.css,
    buildTasks
  );
  // Just go ahead and add `concurrent:build`. It just won't do anything if
  // neither imageoptim plugin is enabled.
  addToTaskList('newer:concurrent:build', true, buildTasks);
  addToTaskList('shell:autoprefixer', mrpig.enable.autoprefixer, buildTasks);
  addToTaskList('newer:sass:build',   mrpig.enable.sass,         buildTasks);
  addToTaskList('shell:uncss',        mrpig.enable.uncss,        buildTasks);
  addToTaskList('cssmin:build',       mrpig.enable.cssmin,       buildTasks);

  addToTaskList(
    'imageoptim:imageAlpha',
    mrpig.enable.imageoptim.imageAlpha,
    concurrentTasks
  );
  addToTaskList(
    'imageoptim:jpegMini',
    mrpig.enable.imageoptim.jpegMini,
    concurrentTasks
  );
  addToTaskList(
    'svgmin',
    mrpig.enable.svgmin,
    concurrentTasks
  );


  // Set the theme paths for the local and built versions of the site.
  mrpig.theme_path      = mrpig.local + '/_themes/' + mrpig.theme;
  mrpig.theme_path_dist = mrpig.dist  + '/_themes/' + mrpig.theme;





  grunt.initConfig({
    // Allow using vars in strings (`'<%= mrpig.theme_path %>'`).
    mrpig: mrpig,


    autoprefixer: {
      dev: {
        files: [{
          expand: true,
          cwd:    mrpig.theme_path + '/css/',
          src:    ['*.css'],
          dest:   mrpig.theme_path + '/css/'
        }],
        options: {
          map: true
        }
      },

      build: {
        src: mrpig.theme_path_dist + '/css/*.css'
      },
      options: {
        browsers: mrpig.autoprefixer.browsers
      }
    },


    browserSync: {
      dev: {
        bsFiles: {
          src: [
            mrpig.theme_path + '/css/**/*.css',
            mrpig.theme_path + '/**/*.{js,html}',
            mrpig.local + '/_content/**/*.md'
          ]
        },
        options: {
          browser:   mrpig.browser,
          proxy:     mrpig.local_url,
          watchTask: true
        }
      }
    },


    buildcontrol: {
      stage: {
        options: {
          remote: mrpig.ssh.user + '@' + mrpig.ssh.host + ':' +
            mrpig.buildcontrol.environments.stage.options.remote,
          branch: 'master'
        }
      },

      live: {
        options: {
          remote: mrpig.ssh.user + '@' + mrpig.ssh.host + ':' +
            mrpig.buildcontrol.environments.live.options.remote,
          branch: 'master'
        }
      },

      options: {
        dir: mrpig.dist,
        commit: true,
        push: true,
        message: mrpig.buildcontrol.options.message
      }
    },


    // Generated by usemin. This is here to prevent errors when using newer.
    concat: {},


    concurrent: {
      build: {
        tasks: concurrentTasks
      }
    },


    copy: {
      // All Statamic core files.
      app: {
        expand: true,
        cwd:    mrpig.local,
        dest:   mrpig.dist,
        src: [
          '_add-ons/**',
          '_app/**',
          '_cache/index.html',
          '_config/**',
          '_content/**',
          '_logs/index.html',
          '_storage/index.html',
          'admin/**',
          '.htaccess',
          'admin.php',
          'index.php'
        ]
      },

      // All theme files that don't get moved by another plugin.
      theme: {
        expand: true,
        cwd:    mrpig.theme_path,
        dest:   mrpig.theme_path_dist,
        src: [
          '{layouts,partials,templates}/**/*.html',
          'css/fonts/**',
          'img/**',
          '*.yaml'
        ]
      },

      // Other, dev-specified necessary files.
      misc: {
        expand: true,
        cwd:    mrpig.local,
        dest:   mrpig.dist,
        src:    mrpig.copy.src
      },

      picturefill: {
        files: {
          '<%= mrpig.theme_path_dist %>/js/vendor/picturefill.min.js': [
            'node_modules/picturefill/dist/picturefill.min.js'
          ]
        }
      },
      options: {
        mode: true
      }
    },


    cssmin: {
      build: {
        files: [{
          expand: true,
          cwd:    mrpig.theme_path_dist + '/css',
          src:    ['*.css'],
          dest:   mrpig.theme_path_dist + '/css',
        }]
      }
    },


    // htmlmin is touchy with Statamic templates.
    // Known incompatibilities:
    // - YAML front matter
    // - Conditionals where boolean attributes are b/w tags w/o whitespace.
    //   Ex: <option {{ if some_var }}selected{{ /if }}>
    //
    // htmlmin: {
    //   build: {
    //     files: [{
    //       expand: true,
    //       cwd:    mrpig.theme_path_dist,
    //       src:    '**/*.html',
    //       dest:   mrpig.theme_path_dist
    //     }],
    //     options: {
    //       collapseBooleanAttributes:     true,
    //       collapseWhitespace:            true,
    //       conservativeCollapse:          true,
    //       minifyCSS:                     true,
    //       minifyJS:                      true,
    //       preserveLineBreaks:            true,
    //       removeAttributeQuotes:         true,
    //       removeComments:                true,
    //       removeEmptyAttributes:         true,
    //       removeEmptyElements:           true,
    //       removeOptionalTags:            true,
    //       removeRedundantAttributes:     true,
    //       removeScriptTypeAttributes:    true,
    //       removeStyleLinkTypeAttributes: true,
    //
    //       // Allow attributes to be wrapped in
    //       // [conditionals with spaces and/or newlines].
    //       customAttrSurround: [
    //         [
    //           // Opening {{ if }}, {{ elseif }}, {{ else }}, {{ unless }},
    //           // or {{ unlesselse }}
    //           /\{\{(.|\n)*(if|elseif|else|unless|unlesselse)(.|\n)*\}\}/,
    //           // Closing {{ /if }} or {{ endif }}
    //           /\{\{(.|\n)*(\/|end)if(.|\n)*\}\}/
    //         ]
    //       ]
    //     }
    //   }
    // },


    imageoptim: {
      imageAlpha: {
        files: [{
          expand: true,
          cwd:    mrpig.dist,
          src:    pushReturn(
            mrpig.imageoptim.imageAlpha.src,
            '_themes/<%= mrpig.theme %>/img/**/*.{jpg,jpeg,png,gif}'
          )
        }],
        options: {
          imageAlpha: true
        }
      },

      jpegMini: {
        files: [{
          expand: true,
          cwd:    mrpig.dist,
          src:    pushReturn(
            mrpig.imageoptim.jpegMini.src,
            '_themes/<%= mrpig.theme %>/img/*.{jpg,jpeg}'
          )
        }],
        options: {
          jpegMini: true
        }
      }
    },


    sass: {
      dev: {
        files: [{
          expand: true,
          cwd:    mrpig.theme_path + '/scss',
          src:    ['*.scss'],
          dest:   mrpig.theme_path + '/css',
          ext:    '.css'
        }],
        options: {
          lineNumbers: true,
          style:       'expanded'
        }
      },

      build: {
        files: [{
          expand: true,
          cwd:    mrpig.theme_path + '/scss',
          src:    ['*.scss'],
          dest:   mrpig.theme_path_dist + '/css',
          ext:    '.css'
        }],
        options: {
          sourcemap: 'none',
          style:     'compressed',
          update:    true
        }
      }
    },


    shell: {
      autoprefixer: {
        // Update the caniuse db for autoprefixer.
        command: 'npm update caniuse-db'
      },

      uncss: {
        command: buildUncssCommand(mrpig.uncss.config, mrpig.local_url)
      }
    },


    svgmin: {
      build: {
        files: [{
          expand: true,
          cwd:    mrpig.theme_path_dist,
          src:    mrpig.svgmin.src,
          dest:   mrpig.theme_path_dist,
          ext:    '.svg'
        }]
      },
      options: {
        plugins: mrpig.svgmin.plugins
      }
    },


    // Generated by usemin. This is here to prevent errors when using newer.
    uglify: {},


    usemin: {
      html: {
        src:  mrpig.usemin.src,
        dest: mrpig.dist
      }
    },


    useminPrepare: {
      html: {
        src:  prependArray(mrpig.theme_path_dist, mrpig.usemin.src),
        dest: mrpig.dist
      }
    },


    watch: {
      configFiles: {
        files: [
          'Gruntfile.js',
          'mr_pig.yaml'
        ]
      },

      dev: {
        files: [mrpig.theme_path + '/scss/**/*.scss'],
        tasks: [
          'sass:dev',
          'autoprefixer:dev'
        ]
      }
    }
  });


// ---


  // Use `serve` to maintain consistency with other popular Gruntfiles.
  grunt.registerTask('serve', [
    'browserSync',
    'watch'
  ]);

  // Set default to `serve` for convenience.
  grunt.registerTask('default', ['serve']);
  grunt.registerTask('build',   buildTasks);

  var target = grunt.option('live') ? 'live' : 'stage';
  grunt.registerTask('deploy', ['buildcontrol:' + target]);
};





// ---





// HELPERS
/**
 * Prepend each value in an array with a string, then return the array.
 * @param {str} str The string to prepend.
 * @param {arr} arr The array whose values need appendin'.
 */
function prependArray(str, arr) {
  for (var i in arr) {
    arr[i] = str + arr[i];
  }

  return arr;
}


/**
 * Push a value to an array, then return the array.
 * @param {arr} arr The array to push to.
 * @param {val} val The value to push to the array.
 */
function pushReturn(arr, val) {
  arr.push(val);

  return arr;
}


/**
 * Recursively merge the properties of two objects into the first, then return
 * the object.
 * @param {object} obj1 The first object.
 * @param {object} obj2 The second object.
 */
function mergeObjects(obj1, obj2) {

  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if (obj2[p].constructor == Object) {
        obj1[p] = mergeObjects(obj1[p], obj2[p]);

      } else {
        obj1[p] = obj2[p];

      }

    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];

    }
  }

  return obj1;
}


/**
 * Use mr_pig.yaml to build the commands for shell:uncss.
 * @param {object} config  The configuration for the command.
 * @param {string} rootUrl The URL to the root page.
 */
function buildUncssCommand(config, rootUrl) {
  // Create an array to hold the commands.
  var commands = [];
  // For each index in the config...
  for (var i in config) {

    // Create the variable to hold the URLs string.
    var urls = '';
    // For each URL in the config...
    for (var url in config[i].urls) {
      // Add the URL and a comma to separate it from the next one.
      urls += rootUrl + config[i].urls[url] + ',';
    }
    // Remove the trailing comma from `urls`.
    urls = urls.substring(0, urls.length - 1);

    // Add each command to the commands array.
    commands.push(
      'node mr_pig/uncss.js ' +
      config[i].stylesheet + ' ' +
      urls
    );

  }

  // Join each command from the array into a single command and return it.
  return commands.join('&&');
}


/**
 * Conditionally add the given task to the given task list.
 * @param {string}  task     The task to add.
 * @param {boolean} enabled  Whether or not to add the task.
 * @param {object}  taskList The task list to add the task to.
 */
function addToTaskList(task, enabled, taskList) {
  if (enabled) {
    return taskList.push(task);
  }
}
