import os
from notion_client import Client

def get_notion_client() -> Client:
    """Get Notion client."""
    api_key = os.environ.get("NOTION_API_KEY")
    if not api_key:
        raise ValueError("Missing Notion API key")
    return Client(auth=api_key)

def get_recipes_from_notion():
    """Fetch all recipes from the Notion database."""
    notion = get_notion_client()
    database_id = os.environ.get("NOTION_RECIPES_DATABASE_ID")

    if not database_id:
        raise ValueError("Missing Notion recipes database ID")

    recipes = []
    has_more = True
    start_cursor = None

    while has_more:
        response = notion.databases.query(
            database_id=database_id,
            start_cursor=start_cursor
        )

        for page in response.get("results", []):
            recipe = parse_recipe_page(page)
            if recipe:
                recipes.append(recipe)

        has_more = response.get("has_more", False)
        start_cursor = response.get("next_cursor")

    return recipes

def parse_recipe_page(page: dict) -> dict:
    """Parse a Notion page into a recipe object."""
    properties = page.get("properties", {})

    # Extract title (Name property)
    name = ""
    name_prop = properties.get("Name", {})
    if name_prop.get("type") == "title":
        title_list = name_prop.get("title", [])
        if title_list:
            name = title_list[0].get("plain_text", "")

    # Extract ingredients (could be a multi-select, rich_text, or relation)
    ingredients = []

    # Try different property names for ingredients
    for prop_name in ["Ingredients", "ingredients", "Items", "items"]:
        if prop_name in properties:
            ing_prop = properties[prop_name]
            prop_type = ing_prop.get("type")

            if prop_type == "multi_select":
                ingredients = [opt.get("name", "") for opt in ing_prop.get("multi_select", [])]
            elif prop_type == "rich_text":
                rich_text = ing_prop.get("rich_text", [])
                if rich_text:
                    text = rich_text[0].get("plain_text", "")
                    # Split by newlines or commas
                    ingredients = [i.strip() for i in text.replace("\n", ",").split(",") if i.strip()]
            break

    # Extract category/tags
    category = ""
    for prop_name in ["Category", "category", "Type", "type", "Tags", "tags"]:
        if prop_name in properties:
            cat_prop = properties[prop_name]
            prop_type = cat_prop.get("type")

            if prop_type == "select":
                select = cat_prop.get("select")
                if select:
                    category = select.get("name", "")
            elif prop_type == "multi_select":
                multi = cat_prop.get("multi_select", [])
                if multi:
                    category = multi[0].get("name", "")
            break

    return {
        "id": page.get("id"),
        "name": name,
        "ingredients": ingredients,
        "category": category,
        "url": page.get("url", ""),
        "last_edited": page.get("last_edited_time", "")
    }

def get_recipe_details(page_id: str) -> dict:
    """Get full details of a recipe including page content."""
    notion = get_notion_client()

    # Get the page
    page = notion.pages.retrieve(page_id=page_id)
    recipe = parse_recipe_page(page)

    # Get page content (blocks) for additional ingredients info
    blocks = notion.blocks.children.list(block_id=page_id)

    content_ingredients = []
    for block in blocks.get("results", []):
        block_type = block.get("type")

        # Look for bulleted lists which often contain ingredients
        if block_type == "bulleted_list_item":
            text_content = block.get("bulleted_list_item", {}).get("rich_text", [])
            if text_content:
                content_ingredients.append(text_content[0].get("plain_text", ""))

    # Merge ingredients from properties and content
    if content_ingredients and not recipe["ingredients"]:
        recipe["ingredients"] = content_ingredients

    return recipe
