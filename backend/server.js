const config = require("./src/config");
const app = require("./src/app");

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`health-app backend listening on http://localhost:${config.port}`);
});
