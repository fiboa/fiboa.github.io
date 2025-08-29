from os import error
from pathlib import Path
from jinja2 import Template
import datetime
import logging
import requests
import os
import sys
import yaml

logger = logging.getLogger(__name__)

headers = {}
env = dict(os.environ)
if "GITHUB_TOKEN" in env:
  headers["Authorization"] = " ".join(["Bearer", os.environ["GITHUB_TOKEN"]])
else:
  logger.warning("No GITHUB_TOKEN found in env")

def unslugify(s: str) -> str:
  return s.replace("-", " ").replace("_", " ").title()

def get_repo(response) -> dict:
  data = {
    "title": unslugify(response["name"]),
    "url": response["html_url"],
    "description": response["description"]
  }
  if response["archived"]:
    data["description"] = "**DEPRECATED.** " + data["description"]
  return data

def get_repos() -> list:
  logger.info(f"Reading list of repositories")

  with requests.get("https://api.github.com/users/fiboa/repos?per_page=1000", headers=headers) as site:
    repos = site.json()
  return repos

def filter_repos(repos, type) -> list:
  data = []
  try:
    for repo in repos:
      if not isinstance(repo, dict):
        logger.error(f"response invalid")
        continue
      if repo["is_template"] or repo["visibility"] !=	"public" or type not in repo["topics"]:
        continue
      data.append(get_repo(repo))
  except error as e:
    logger.error(f"fiboa org not available: {e}")
  return data

def get_externals(base) -> list:
  data = []
  config = yaml.safe_load((base / "external.yaml").read_text())
  for r in config["github"]:
    try:
      logger.info(f"Reading community GitHub repos individually")
      with requests.get(f"https://api.github.com/repos/{r['org']}/{r['repo']}", headers=headers) as repo:
        data.append(get_repo(repo.json()))
    except error as e:
      logger.error(f"community repo not available: {e}")

  for r in config["external"]:
    data.append(r)

  return data

def create_overview(repos, folder, label):
  print(f"Generating {folder}")
  base = Path(f"./{folder}/")
  data = filter_repos(repos, label)
  data.extend(get_externals(base))
  data.sort(key = lambda x: x["title"])
  count = len(data)
  now = datetime.datetime.now(datetime.timezone.utc).strftime("%b %d %Y, %H:%M %Z")
  template = Template((base / "index.md.jinja").read_text())
  target = base / "index.md"
  content = template.render(data=data, updated=now, count=count)

  with open(target, "w", encoding="utf-8") as f:
    f.write(content)
  
def main():
  repos = get_repos()
  create_overview(repos, "extensions", "extension")
  create_overview(repos, "software", "software")
  sys.exit(0)


if __name__ == "__main__":
  main()
