import { cleanEnv, str, port } from "envalid";

const validateEnv = (): void => {
  cleanEnv(process.env, {
    NODE_ENV: str({
      choices: ["development", "production"],
    }),
    DATABASE_URL: str(),
    PORT: port({ default: 8080 }),
    JWT_SECRET: str(),
  });
}

export default validateEnv;