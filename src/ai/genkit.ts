import {genkit} from 'genkit';
import {ollama} from 'genkitx-ollama';

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OLLAMA_SERVER = process.env.OLLAMA_SERVER || 'http://localhost:11434';

export const ai = genkit({
  plugins: [
    ollama({
      models: [{ name: OLLAMA_MODEL }],
      serverAddress: OLLAMA_SERVER,
    }),
  ],
  model: `ollama/${OLLAMA_MODEL}`,
});
