export interface HimiSkill {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  getPrompt: () => string;
}
