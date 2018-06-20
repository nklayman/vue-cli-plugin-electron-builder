module.exports = [
  {
    name: 'dir',
    type: 'confirm',
    default: false,
    description: "Only package app, don't create installers",
    group: 'General'
  },
  {
    name: 'archs',
    type: 'checkbox',
    description: 'Select your architectures to build for:',
    group: 'General',
    choices: [
      {
        name: '64 bit desktop',
        value: 'x64',
        checked: true
      },
      {
        name: '32 bit desktop',
        value: 'ia32'
      },
      {
        name: 'armv7l',
        value: 'armv7l'
      },
      {
        name: '64 bit arm',
        value: 'arm64'
      }
    ]
  },
  {
    name: 'windows',
    type: 'confirm',
    default: false,
    description: 'Build for Windows',
    group: 'Windows'
  },
  {
    name: 'windowsTargets',
    message: 'Select your targets for Windows:',
    type: 'checkbox',
    group: 'Windows',
    when: answers => answers.windows === true,
    choices: [
      {
        name: 'NSIS (default)',
        value: 'nsis',
        checked: true
      },
      {
        name: 'AppX (Windows store)',
        value: 'appx'
      },
      {
        name: 'Squirrel.Windows',
        value: 'squirrel'
      },
      {
        name: '7 Zip',
        value: '7z'
      },
      {
        name: 'Zip File',
        value: 'zip'
      },
      {
        name: 'Tar XZ',
        value: 'tar.xz'
      },
      {
        name: 'Tar LZ',
        value: 'tar.lz'
      },
      {
        name: 'Tar Gzip',
        value: 'tar.gz'
      },
      {
        name: 'Tar BZ2',
        value: 'tar.bz2'
      }
    ]
  },
  {
    name: 'linux',
    type: 'confirm',
    default: false,
    description: 'Build for Linux',
    group: 'Linux'
  },
  {
    name: 'linuxTargets',
    message: 'Select your targets for Linux:',
    type: 'checkbox',
    group: 'Linux',
    when: answers => answers.linux === true,
    choices: [
      {
        name: 'App Image (default)',
        value: 'AppImage',
        checked: true
      },
      {
        name: 'Snap',
        value: 'snap'
      },
      {
        name: 'Deb',
        value: 'deb'
      },
      {
        name: 'RPM',
        value: 'rpm'
      },
      {
        name: 'Free BSD',
        value: 'freebsd'
      },
      {
        name: 'PacMan',
        value: 'pacman'
      },
      {
        name: 'p5p',
        value: 'p5p'
      },
      {
        name: 'apk',
        value: 'apk'
      },
      {
        name: '7 Zip',
        value: '7z'
      },
      {
        name: 'Zip File',
        value: 'zip'
      },
      {
        name: 'Tar XZ',
        value: 'tar.xz'
      },
      {
        name: 'Tar LZ',
        value: 'tar.lz'
      },
      {
        name: 'Tar Gzip',
        value: 'tar.gz'
      },
      {
        name: 'Tar BZ2',
        value: 'tar.bz2'
      }
    ]
  },
  {
    name: 'macos',
    type: 'confirm',
    default: false,
    description: 'Build for MacOS',
    group: 'Mac OS'
  },
  {
    name: 'macosTargets',
    message: 'Select your targets for Mac OS:',
    type: 'checkbox',
    group: 'Mac OS',
    when: answers => answers.macos === true,
    choices: [
      {
        name: 'dmg',
        value: 'dmg',
        checked: true
      },
      {
        name: 'mas',
        value: 'mas'
      },
      {
        name: 'mas dev',
        value: 'mas-dev'
      },
      {
        name: 'pkg',
        value: 'pkg'
      },
      {
        name: '7 Zip',
        value: '7z'
      },
      {
        name: 'Zip File',
        value: 'zip',
        checked: true
      },
      {
        name: 'Tar XZ',
        value: 'tar.xz'
      },
      {
        name: 'Tar LZ',
        value: 'tar.lz'
      },
      {
        name: 'Tar Gzip',
        value: 'tar.gz'
      },
      {
        name: 'Tar BZ2',
        value: 'tar.bz2'
      }
    ]
  }
]
