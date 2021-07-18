// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
const isDocker = require('is-docker')();

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
        random: false
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    // you can define custom flags
    customLaunchers: {
      CustomChromeHeadless: {
        base: 'ChromeHeadless',
        // The "--no-sandbox" flag is required when using Chrome inside Docker
        flags: isDocker ? ['--no-sandbox'] : []
      }
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/mineos-app'),
      subdir: '.',
      reporters: [
        { type: 'lcov' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['CustomChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true
  });
};
