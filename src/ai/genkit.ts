import {genkit} from 'genkit';
import {ollama} from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    ollama({
      models: [{ name: 'llama3.1:8b' }],
      serverAddress: 'http://localhost:11434',
    }),
  ],
  model: 'ollama/llama3.1:8b',
});
