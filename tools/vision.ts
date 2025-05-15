import { z } from "zod";
import { tool } from "@langchain/core/tools";


const visionTool = tool(
  async (_input): Promise<string> => {
    return "<need_vision>" + _input.prompt + "</need_vision>";
  },
  {
    name: "visionTool",
    description: "Vision tool for Minecraft bot. This tool is used to send a prompt to the vision tool. When you need vision, use this tool.",
    schema: z.object({
        prompt : z.string().describe("The prompt to send to the vision tool"),}
    ),
  }
);

export { visionTool };
