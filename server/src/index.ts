import { createApp } from "./app";
import { config } from "./config/env";
import { seedMockAccounts } from "./db/seed";

seedMockAccounts();

createApp().listen(config.port);
