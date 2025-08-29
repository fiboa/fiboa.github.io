from pathlib import Path
from jinja2 import Template
import datetime
import logging
import json
import re
import sys
import yaml

logger = logging.getLogger(__name__)

def get_externals() -> list:
  data = []

  return data

def main() -> bool:
  logger.info(f"Reading lists of datasets")

  catalog = json.loads(Path('./stac/catalog.json').read_text())
  data = list(filter(lambda link: link["rel"] == "child", catalog["links"]))

  for i, d in enumerate(data):
    title = re.sub(r"^Field\s+boundaries\s+for\s+", "", d["title"])
    title = title[0].upper() + title[1:]
    data[i]["title"] = title
  
  config = yaml.safe_load(Path("./data/external.yaml").read_text())
  for r in config["external"]:
    data.append(r)

  data.sort(key = lambda x: x["title"])
  count = len(data)
  now = datetime.datetime.now(datetime.timezone.utc).strftime("%b %d %Y, %H:%M %Z")
  template = Template(Path("./data/index.md.jinja").read_text())
  content = template.render(data=data, updated=now, count=count)
  with open("./data/index.md", "w", encoding="utf-8") as f:
    f.write(content)

  sys.exit(0)


if __name__ == "__main__":
  main()
