import { createApp } from "./app";
import { config } from "./config/env";
import { seedMockAccounts } from "./db/seed";

seedMockAccounts();

const app = createApp({ seedDemoQueue: true });

app.listen(config.port, () => {
  console.log(`QueueSmart backend running at http://localhost:${config.port}`);
});
