## About fiboa
The Field Boundaries for Agriculture (fiboa) project is focused on making field boundary data openly available in a unified format on a global scale. We believe that the fiboa specification is a foundational aspect of agricultural field boundary data interoperability which enables and accelerates additional layers of collaboration and detail via custom extensions. 

The fiboa specification is the first project to emerge from the Field Boundary Initiative, the first iteration of [Taylor Geospatial Engine’s Innovation Bridge Program](https://tgengine.org/taylor-geospatial-engines-first-innovation-bridge/). The goal of fiboa is to spur collaboration between academia, the commercial industry, NGO’s, and governments towards adopting a common data schema and leveraging AI and earth observation data to create global field boundary datasets for agriculture. fiboa is a non-controversial application that enables developers and data consumers to focus on innovation rather than data schemas and mapping across sources.

## Key Features
The center of fiboa is a specification for representing field boundary data in GeoJSON & GeoParquet in a standard way, with several optional ‘extensions’ that specify additional attributes. The core data schema of fiboa is quite simple - it is a set of definitions for attribute names and values. The number of attributes in the core is quite small by design. The idea is that most of the ‘interesting’ data about the field will be located in ‘extensions’. 

The bulk of the valuable information will be located in the extensions. There will likely be lots of different types of extensions: some that are generally accepted as the main way to do things in fiboa and widely understood by tools and others that are very niche and not widely used but valuable to a small number of users (e.g. an extension specific to a company or organization to help them better validate their data). 

You can learn more about the technologies behind the fiboa specification, read the full specification text, and explore available open data sets and extensions at the links below.

- [The Specification](https://github.com/fiboa/specification)
- [List of Tutorials](https://github.com/fiboa/tutorials)
- [List of Datasets](https://github.com/fiboa/data)
  - [Map of the datasets](https://fiboa.org/map)
- [List of Extensions / Guide to Creating Extensions](https://github.com/fiboa/extensions)
- [List of Software / Tooling](https://github.com/fiboa/software)
  - [CLI: GeoParquet Validation, Conversion, etc. in Python](https://github.com/fiboa/cli)
- [Data Survey](https://github.com/fiboa/data-survey) 

## Developer Communication Channels
The fiboa community strives to provide a welcoming and transparent environment for all of the project’s participants. You can find additional information about our community’s best practices and collaborative development processes below:
- [Code of Conduct](https://github.com/fiboa/specification/blob/main/CODE_OF_CONDUCT.md)
- [Contribution Guideline](https://github.com/fiboa/specification/blob/main/CONTRIBUTING.md)
- [Development and Release Process](https://github.com/fiboa/specification/blob/main/process.md)

The fiboa developer community has a number of communication channels available for discussion and collaboration.

We encourage you to utilize our [Slack](https://cloudnativegeo.slack.com/archives/C06ET015VGS) for general and administrative questions.
You’re also welcome to attend the bi-weekly Zoom meetings where the research and developer community shares updates, discusses the roadmap, and gives the occasional live demonstration.
To get on the email list, please sign up for the [fiboa Google Group](https://groups.google.com/a/tgengine.org/g/fiboa).
Joining this Google Group will also get you a calendar invite for the bi-weekly meetings as well as any other general fiboa meetings.

- [Slack](https://cloudnativegeo.slack.com/archives/C06ET015VGS)
- [Google Group](https://groups.google.com/a/tgengine.org/g/fiboa)
- Open Discussions and issue trackers for specific topics:
  - [Specification related issues](https://github.com/fiboa/specification/issues)
  - [New extensions or high-level extension discussions](https://github.com/fiboa/extensions/issues)
  - [New software/tooling or high-level software/tooling discussions](https://github.com/fiboa/software/issues)
  - [New datasets or data-related issues](https://github.com/fiboa/data/issues)
  - [Missing learning resources or related issues](https://github.com/fiboa/tutorials/issues)
  - [Discussions that span multiple topics (e.g. specification, tooling, extensions)](https://github.com/fiboa/specification/discussions)
  - Discussions and issues around specific tooling or extensions goes into the [corresponding repositories](https://github.com/orgs/fiboa/repositories)

