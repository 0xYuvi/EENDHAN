import os
import sys
from dotenv import load_dotenv

# Add the current directory to python path if run directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from inference import run_analyzer

def test_inference_mock_resume():
    # Load environment variables (Make sure you have an .env file with GROQ_API_KEY)
    load_dotenv()
    
    if not os.environ.get("GROQ_API_KEY"):
        print("Skipping test: GROQ_API_KEY is not set. Please create a .env file locally.")
        return

    sample_resume = """
    John Doe
    Software Engineer
    
    Experience:
    - 6 months as an intern at a local web agency doing HTML and CSS.
    - Built a calculator app in React.
    
    Education:
    - Self-taught via YouTube tutorials.
    
    Skills:
    - HTML, CSS, JavaScript framework watcher.
    """

    print("Running Analyzer on Sample Resume...")
    try:
        result = run_analyzer(sample_resume)
        print("\n--- RESULTS ---\n")
        print(f"Score: {result.get('score')}/100")
        print("\nFeedback Points:")
        for point in result.get('feedback_points', []):
            print(f"- {point}")
    except Exception as e:
        print(f"An error occurred during inference test: {e}")

if __name__ == "__main__":
    test_inference_mock_resume()
