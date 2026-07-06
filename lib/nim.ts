const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export async function callNim(model: string, messages: Record<string, unknown>[]) {
    const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages }),
    });
    return res.json();
}