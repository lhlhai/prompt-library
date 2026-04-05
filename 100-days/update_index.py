import os
import json
import re

def update_index():
    data_dir = '100-days/data'
    index_file = os.path.join(data_dir, 'index.json')
    
    # Read existing index.json to preserve metadata
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    else:
        index_data = {
            "posts": [],
            "categories": ["All Topics"],
            "categoryDetails": [],
            "specializedDomains": []
        }

    posts = []
    pattern = re.compile(r'^\d{3}\.json$')
    
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} not found.")
        return

    for filename in sorted(os.listdir(data_dir)):
        if pattern.match(filename):
            file_path = os.path.join(data_dir, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    post_data = json.load(f)
                    
                metadata = {
                    "id": post_data.get("id"),
                    "file": filename,
                    "day": post_data.get("day"),
                    "title": post_data.get("title"),
                    "category": post_data.get("category"),
                    "author": post_data.get("author"),
                    "image": post_data.get("image")
                }
                posts.append(metadata)
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    posts.sort(key=lambda x: x['id'] if x['id'] is not None else 0, reverse=True)
    index_data["posts"] = posts
    
    # Collect all categories from posts
    post_categories = set()
    for post in posts:
        cat = post.get("category")
        if cat:
            post_categories.add(cat)

    # Rebuild categories list
    new_categories = ["All Topics"]
    added_lower = {"all topics"}
    
    predefined = ["UI Testing", "API Testing", "SDLC", "Mobile Testing", "Tools", "Best Practices", "Fundamentals"]
    for cat in predefined:
        if cat.lower() not in added_lower:
            new_categories.append(cat)
            added_lower.add(cat.lower())
            
    for cat in sorted(list(post_categories)):
        if cat.lower() not in added_lower:
            new_categories.append(cat)
            added_lower.add(cat.lower())
    
    index_data["categories"] = new_categories

    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully updated {index_file} with {len(posts)} posts.")

if __name__ == "__main__":
    update_index()
