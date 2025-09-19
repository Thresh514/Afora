const apiRequest = require("./apiRequest");

async function testConnection() {
    try {
        const result = await apiRequest({
            context: "You are a helpful assistant.",
            input: "Say hello!",
            functionName: "test",
            responseFormat: {
                type: "json_schema",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "A greeting message"
                        }
                    },
                    required: ["message"]
                }
            }
        });
        // console.log("Connection test successful:", result);
    } catch (error) {
        console.error("Connection test failed:", error);
    }
}

testConnection(); 