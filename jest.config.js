module.exports = {
  //   moduleFileExtensions: ['js', 'json'],
  //   transform: {
  //     // '^.+\\.vue$': 'vue-jest',
  //     // '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
  //     '^.+\\.jsx?$': 'babel-jest'
  //   }
  //   moduleNameMapper: {
  //     '^@/(.*)$': '<rootDir>/src/$1'
  //   },
  // //   snapshotSerializers: ['jest-serializer-vue'],
  //   testMatch: ['<rootDir>/__tests__/**.spec.js']
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/testSetup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/projects/']
}
