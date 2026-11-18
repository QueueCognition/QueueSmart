import { createApp } from "./app";
import { config } from "./config/env";

const app = createApp();

app.listen(config.port, () => {
  console.log(`QueueSmart backend running at http://localhost:${config.port}`);
});
