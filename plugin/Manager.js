export default class Manager {
  constructor(config, logger) {
    this.plugins = [];
    this.config = config;
    this.logger = logger;
  }

  register(plugin) {
    this.plugins.push(new plugin(this.config, this.logger));
  }

  async executeAll() {
    for (const plugin of this.plugins) {
      try {
        await plugin.validateConfig();
        await plugin.execute();
      } catch (error) {
        await plugin.onError(error);
        break;
      }
    }
  }
}
