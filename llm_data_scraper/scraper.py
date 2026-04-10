import trafilatura
import json
import os

def scrape_to_jsonl(urls, output_filename="llm_training_data.jsonl"):
    """
    Scrapes a list of URLs and saves the main text content to a JSONL file
    ready for LLM training.
    """
    print(f"Starting scraper... Output will be saved to {output_filename}")
    
    # Ensure the directory for the output file exists
    os.makedirs(os.path.dirname(output_filename) if os.path.dirname(output_filename) else '.', exist_ok=True)
    
    successful_scrapes = 0
    with open(output_filename, "w", encoding="utf-8") as f:
        for url in urls:
            print(f"Scraping: {url}...")
            # Download the webpage
            downloaded = trafilatura.fetch_url(url)
            
            if downloaded:
                # Extract only the main text
                text = trafilatura.extract(downloaded)
                
                if text:
                    # Create the JSON object format required by LLMs
                    data_point = {"text": text}
                    
                    # Write to the file as a JSON line
                    json.dump(data_point, f)
                    f.write("\n")
                    successful_scrapes += 1
                else:
                    print(f"  -> Failed to extract text from {url}")
            else:
                 print(f"  -> Failed to download {url}")
                 
    print(f"\nDone! Successfully scraped {successful_scrapes} out of {len(urls)} URLs.")

if __name__ == "__main__":
    # Add the URLs you want to scrape here
    target_urls = [
        "https://en.wikipedia.org/wiki/Large_language_model",
        "https://en.wikipedia.org/wiki/Machine_learning"
    ]
    
    scrape_to_jsonl(target_urls, "dataset/llm_training_data.jsonl")
