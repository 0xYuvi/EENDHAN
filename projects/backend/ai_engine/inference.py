import os
import json
from groq import Groq

def run_analyzer(resume_text: str) -> dict:
    """
    Connects to the Groq API to analyze a resume using a fast LLaMA model.
    Uses a highly opinionated system prompt to act as a harsh Tech Recruiter.
    Returns a dictionary containing a score (1-100) and 3 bullet points of brutal feedback.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is missing.")

    client = Groq(api_key=api_key)

    system_instruction = (
        "You are a brutally honest, no-nonsense Senior Tech Recruiter at a top-tier tech company. "
        "Your job is to review the provided resume text and give a harsh but fair critique. "
        "Do not use polite fluff. Be direct and strict. "
        "You MUST respond ONLY with a valid JSON object matching this schema:\n"
        "{\n"
        "  \"score\": <integer from 1 to 100>,\n"
        "  \"feedback_points\": [\n"
        "     \"<brutal bullet point 1>\",\n"
        "     \"<brutal bullet point 2>\",\n"
        "     \"<brutal bullet point 3>\"\n"
        "  ]\n"
        "}"
    )

    prompt = f"Here is the candidate's resume:\n\n{resume_text}"

    # We use llama3-8b-8192 or llama3-70b-8192 for fast json inference
    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_instruction,
            },
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        response_format={"type": "json_object"},
        temperature=0.7
    )

    try:
        # The model is instructed to return only JSON
        result_json = response.choices[0].message.content
        data = json.loads(result_json.strip())
        return data
    except Exception as e:
        # Fallback if parsing fails
        return {
            "score": 0,
            "feedback_points": [
                f"Failed to analyze the resume appropriately. Error: {str(e)}",
                "The recruiter threw your resume in the trash because the text was unreadable.",
                "Ensure your resume contains parseable, standard text."
            ]
        }
