import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const apiRequest = async ({ context, responseFormat, input, functionName }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

    try {
        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o",
                messages: [
                    { role: "system", content: context },
                    { role: "user", content: input },
                ],
                tools: [
                    {
                        type: "function",
                        function: {
                            name: functionName,
                            description: `Function for ${functionName}`,
                            parameters: responseFormat.json_schema.schema,
                        },
                    },
                ],
                tool_choice: {
                    type: "function",
                    function: { name: functionName },
                },
                n: 1,
                temperature: 0.2,
                max_tokens: 7000,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            },
            {
                signal: controller.signal,
                timeout: 120000,
            }
        );

        clearTimeout(timeoutId);

        const functionCall = response.choices[0].message.tool_calls?.[0];
        const raw = functionCall?.function?.arguments;
        const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
        
        if (!rawStr) {
            throw new Error("No arguments returned from function call.");
        }
        
        return rawStr;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.code === "ETIMEDOUT" || error.name === "AbortError") {
            throw new Error(
                "OpenAI API request timed out. Please check your internet connection and try again."
            );
        }
        if (error.status === 401) {
            throw new Error("Invalid OpenAI API key. Please check your .env.local file.");
        }
        if (error.status === 429) {
            throw new Error("OpenAI API rate limit exceeded. Please try again later.");
        }

        console.error("❌ Error fetching completion:", error);
        throw error;
    }
};

