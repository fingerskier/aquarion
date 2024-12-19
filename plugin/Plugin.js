export default class Plugin {
  constructor(config) {
    this.config = config;
  }

  execute() {
    throw new Error('Execute method must be implemented by subclass');
  }

  validateConfig() {
    throw new Error('validateConfig method must be implemented by subclass');
  }
}