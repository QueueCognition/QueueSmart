import { createApp } from "./app";
import { config } from "./config/env";

const app = createApp({ seedDemoQueue: true });

app.listen(config.port, () => {
  console.log(`QueueSmart backend running at http://localhost:${config.port}`);
});
