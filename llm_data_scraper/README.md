# LLM Data Scraper

This is a simple data collector designed to scrape articles from the web, clean out all the HTML noise, and format the resulting text into a `JSONL` file ready for training or fine-tuning Large Language Models (LLMs).

## Getting Started

1. **Install Dependencies:**
   Make sure you have python installed. Run the following command to install the required library (`trafilatura`):
   ```bash
   pip install -r requirements.txt
   ```

2. **Add Your URLs:**
   Open `scraper.py` and modify the `target_urls` list near the bottom of the file with the specific websites you want to scrape.

3. **Run the Scraper:**
   ```bash
   python scraper.py
   ```

## Output
The script will automatically create a `dataset` folder and save the results inside as `llm_training_data.jsonl`. 

Each line in the file will contain a JSON object with the scraped text, which is the standard format required for platforms like Hugging Face, OpenAI, and for local fine-tuning scripts.
