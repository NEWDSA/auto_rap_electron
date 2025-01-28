/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
  ],
  extraMetadata: {
    main: 'dist-electron/main.js',
  },
  // 预加载脚本编译配置
  extraFiles: [
    {
      from: 'electron/preload.ts',
      to: 'dist-electron/preload.js',
      filter: ['**/*'],
    },
  ],
} 