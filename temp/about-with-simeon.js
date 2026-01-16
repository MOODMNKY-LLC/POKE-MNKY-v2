import React from 'react';

import Link from '../components/Link';
import {PlainPage} from '../components/Page';
import styles from './about.module.scss';

const Faq = ({title, children}) => (
    <React.Fragment>
        <h3 className={styles.faq_title}>{title}</h3>
        <div className={styles.faq_body}>{children}</div>
    </React.Fragment>
);

export default function About() {
    return (
        <PlainPage title="About">
            <h1>About PokéAPI</h1>

            <Faq title="What is this?">
                <p>
                    This website provides a RESTful API interface to highly detailed objects built from thousands 
                    of lines of data related to{' '}
                    <a href="https://en.wikipedia.org/wiki/Pokemon">Pokémon</a>. We specifically cover the video 
                    game franchise. This API powers the <strong>Average at Best Battle League</strong> platform, 
                    providing all the Pokémon data used for team building, draft preparation, and competitive analysis.
                </p>
                <p>
                    Using this API, you can access comprehensive information on Pokémon, their moves, abilities, 
                    types, egg groups, and much more—everything you need to excel in competitive Pokémon battles.
                </p>
            </Faq>
            <Faq title="How is this used in the Average at Best Battle League?">
                <p>
                    The Average at Best Battle League platform integrates this API to power core features:
                </p>
                <ul>
                    <li><strong>Pokédex</strong> - Browse and search all Pokémon with detailed stats and information</li>
                    <li><strong>Team Builder</strong> - Access move sets, abilities, and type data for team construction</li>
                    <li><strong>Draft Preparation</strong> - Research Pokémon before draft day with complete data access</li>
                    <li><strong>Matchup Analysis</strong> - Analyze type effectiveness and base stats for strategic planning</li>
                    <li><strong>Competitive Research</strong> - Explore moves, abilities, and Pokémon mechanics</li>
                </ul>
                <p>
                    Coaches can also use this API documentation to build custom tools, integrate data into their own 
                    workflows, or understand how the league platform accesses and displays Pokémon information.
                </p>
            </Faq>
            <Faq title="Who built the Average at Best Battle League platform?">
                <p>
                    The Average at Best Battle League platform and this documentation site were built by{' '}
                    <strong>Simeon Bowman</strong>, a league member and the league's foremost app developer. 
                    Simeon architected and developed the entire ecosystem—including the Next.js application, 
                    server infrastructure, battle integration, and this API documentation site—specifically for 
                    the Average at Best Battle League community.
                </p>
                <p>
                    This comprehensive platform was developed under <strong>MOODMNKY LLC</strong>, bringing together 
                    modern web technologies, battle simulation infrastructure, and comprehensive Pokémon data to create 
                    a complete competitive league management system.
                </p>
                <p>
                    The platform integrates PokéAPI data with custom league features including draft management, team 
                    rosters, match scheduling, standings tracking, and seamless Discord integration—all designed to 
                    enhance the competitive experience for league coaches.
                </p>
            </Faq>
            <Faq title="What is an API?">
                <p>
                    An API (Application Programming Interface) is a contract that allows developers to interact with 
                    an application through a set of interfaces. In this case, the application is a database of 
                    thousands of Pokémon-related objects, and the interfaces are URL links.
                </p>
                <p>
                    A RESTful API is an API that conforms to a set of loose conventions based on HTTP verbs, errors, 
                    and hyperlinks. This makes it easy to access Pokémon data programmatically for use in applications, 
                    tools, or integrations like the Average at Best Battle League platform.
                </p>
            </Faq>
            <Faq title="Why use a centralized API?">
                <p>
                    Having a single source of Pokémon data ensures consistency and accuracy across all applications 
                    that use it—including the Average at Best Battle League platform.
                </p>
                <p>
                    When new Pokémon games or updates are released, this API is updated once, and all consuming 
                    applications (like the league platform) automatically have access to the latest information. 
                    This eliminates inconsistencies and ensures coaches always have accurate, up-to-date data for 
                    competitive play.
                </p>
                <p>
                    The overall benefit is better collaboration, consistency, and reliability across all Pokémon 
                    applications and tools. It's good for developers, coaches, and the entire competitive community!
                </p>
            </Faq>
            <Faq title="How much information is available?">
                <p>A comprehensive database covering all aspects of competitive Pokémon.</p>
                <p>
                    We currently have <strong>tens of thousands</strong> of individual items in our database, including:
                </p>
                <ul>
                    <li>Moves (with power, accuracy, type, and effects)</li>
                    <li>Abilities (with descriptions and effects)</li>
                    <li>Pokémon (including various forms and variants)</li>
                    <li>Types (with effectiveness charts)</li>
                    <li>Egg Groups</li>
                    <li>Game Versions</li>
                    <li>Items (including held items)</li>
                    <li>Pokédexes</li>
                    <li>Pokémon Evolution Chains</li>
                    <li>Base Stats</li>
                    <li>And much more!</li>
                </ul>
                <p>
                    All of this data is essential for competitive play in the Average at Best Battle League. 
                    To see all the different types of data available, check out{' '}
                    <Link to="/docs/v2">the complete API documentation</Link>.
                </p>
            </Faq>
            <Faq title="The API is missing something!">
                <p>
                    We know! Feel free to contribute to open issues on{' '}
                    <a href="https://github.com/PokeAPI/pokeapi/">GitHub</a>. The PokéAPI project is open source 
                    and community-driven, with contributions from developers worldwide.
                </p>
                <p>
                    If you find data that's missing or incorrect, especially data relevant to competitive play, 
                    your contributions help improve the API for everyone—including the Average at Best Battle League community.
                </p>
            </Faq>
            <Faq title="So who built this?">
                <p>
                    PokéAPI V1 was created by{' '}
                    <a href="https://github.com/phalt">Paul Hallett</a> as a weekend project but it quickly became 
                    more than a weekend's worth of work. In December of 2014 Paul deprecated V1 in favor of working on V2.
                </p>
                <p>
                    This is where{' '}
                    <a href="https://github.com/zaneadix">Zane Adickes</a>{' '}
                    jumped in. Zane thought the original project was a fantastic idea and wanted to help it grow. 
                    With direction from Paul, Zane created the V2 API using an exact mirror of{' '}
                    <a href="https://github.com/eevee">Veekun's</a> data related to the main series of games.
                </p>
                <p>
                    During summer 2018, Paul decided to hand over the project to the community. This is where Tim Malone, 
                    Mark Tse, Sargun Vohra, Charles Marttinen, Alessandro Pezzé, Alberto Oliveira da Silva, and Lucio 
                    Merotta came together and started planning how to change the infrastructure in order to improve 
                    performance and cut down on hosting costs. An important step was to convert the API to serve static 
                    JSON files, which was made possible by Sargun and his excellent <a href="https://github.com/PokeAPI/ditto">PokeAPI/ditto</a> tool. 
                    The frontend website was also re-built by Charles at the same time. The whole process was completed 
                    in October 2018.
                </p>
                <p>
                    After this massive redesign, PokéAPI gained many new consumers due to its new blazing fast performance. 
                    To give a quick reference, the loading of the infamous <a href="https://pokeapi.co/api/v2/pokemon/magikarp">Magikarp pokemon resource</a> 
                    passed from seconds to ~80ms. An important milestone for the PokéAPI project happened shortly after 
                    in summer 2020, when its GitHub repository reached <strong>2000 stargazers</strong> and in a single 
                    month fulfilled <strong>100 million</strong> API calls.
                </p>
                <p>
                    In August 2020 the PokéAPI community decided <a href="https://github.com/PokeAPI/pokeapi/issues/520">to temporarily fork</a>{' '}
                    <a href="https://github.com/veekun/pokedex">veekun/pokedex</a>, which was the primary and only source 
                    of data. This operation was planned in order to add new generation-8 data, which Veekun lacked. The 
                    following people contributed to fetching and formatting generation-8 and newer data: <a href="https://github.com/Naramsim">Alessandro Pezzé</a>, 
                    <a href="https://github.com/ichbinfrog"> Hoang Quoc Trung</a>, <a href="https://github.com/CMahk">Chandler Mahkorn</a>, 
                    <a href="https://github.com/AndreArrebola"> André Sousa</a>, <a href="https://github.com/alex-whan">Alexander Whan</a>, 
                    <a href="https://github.com/myoKun345"> Austin Jones</a>, <a href="https://github.com/tomi-912">tomi-912</a>, 
                    <a href="https://github.com/ercdndrs"> Eric Donders</a>, <a href="https://github.com/pifopi">Gaël Dottel</a>, 
                    <a href="https://github.com/Parnassius">Parnassius</a> and <a href="https://github.com/anhthang">Anh Thang</a>.
                </p>
                <p>
                    In January 2023 <a href="https://github.com/bitomic">bitomic</a>, <a href="https://github.com/giginet">Kohki Miki</a>, 
                    <a href="https://github.com/pebou"> Paul-Émile</a>, <a href="https://github.com/tillfox">tillfox</a> scraped 
                    generation 9 data from the web and added it here.
                </p>
                <p>
                    The current owners of the PokéAPI project are <a href="https://github.com/phalt">Paul Hallett</a>,{' '}
                    <a href="https://github.com/tdmalone">Tim Malone</a> and <a href="https://github.com/Naramsim">Alessandro Pezzé</a>. 
                    Alongside them other core maintainers include <a href="https://github.com/cmmartti">Charles Marttinen</a> and{' '}
                    <a href="https://github.com/sargunv">Sargun Vohra</a>.
                </p>
                <p>
                    We also have a{' '}
                    <a href="https://github.com/pokeapi">GitHub organisation</a>{' '}
                    of contributors that you are welcome to join!
                </p>
                <p>
                    <strong>League Platform Implementation:</strong> The Average at Best Battle League platform's custom 
                    implementation of this API, including this documentation site, was developed by{' '}
                    <strong>Simeon Bowman</strong> under <strong>MOODMNKY LLC</strong>. This self-hosted instance 
                    ensures optimal performance and reliability for league operations, with custom theming and 
                    integration specifically designed for the competitive league environment.
                </p>
            </Faq>
            <Faq title="Where did you get all of this data?">
                <p>
                    We gathered the information on this site from various resources:
                </p>
                <ul>
                    <li>
                        <a href="https://github.com/veekun" target="none">
                            Veekun
                        </a>{' '}
                        has a fantastic{' '}
                        <a href="http://veekun.com/dex" target="none">
                            Pokedex
                        </a>{' '}
                        which is also an open source{' '}
                        <a
                            href="https://github.com/veekun/pokedex"
                            target="none"
                        >
                            project
                        </a>{' '}
                        containing a ton of csv data. We used this to flesh out
                        the database that powers Pokéapi.
                    </li>
                    <li>
                        Generation 8 data is scraped from <a href="https://bulbapedia.bulbagarden.net/wiki/Generation_VIII">different resources</a> which are considered to be trustful. Later on the data was integrated with the official one released by Veekun.
                    </li>
                </ul>
                <p>We'd also like to thank:</p>
                <ul>
                    <li>
                        Laven Pillay, who scraped together most of the sprites
                        used on the site.
                    </li>
                    <li>
                        <a href="https://github.com/Naramsim">
                            Alessandro Pezzé
                        </a>
                        , who worked tirelessly to add the Sun/Moon updates.
                    </li>
                    <li>
                        <a href="https://github.com/MOODMNKY-LLC">
                            <strong>Simeon Bowman</strong>
                        </a>{' '}
                        of{' '}
                        <a href="https://github.com/MOODMNKY-LLC">
                            <strong>MOODMNKY LLC</strong>
                        </a>, who developed and maintains 
                        the Average at Best Battle League platform and this custom API documentation site, bringing 
                        comprehensive Pokémon data to the competitive league community.
                    </li>
                </ul>
            </Faq>
            <Faq title="What's the technology stack?">
                <p>
                    Up until November 2018, the API and website were built
                    together in a single{' '}
                    <a href="https://python.org" target="none">
                        Python
                    </a>{' '}
                    project using the{' '}
                    <a href="https://djangoproject.com" target="none">
                        Django framework
                    </a>{' '}
                    and paired with a{' '}
                    <a href="https://www.postgresql.org" target="none">
                        PostgreSQL
                    </a>{' '}
                    database to store the data.{' '}
                    <a
                        href="http://www.django-rest-framework.org/"
                        target="none"
                    >
                        Django REST Framework
                    </a>{' '}
                    was used to expose the data through a RESTful API. The entire stack was deployed at <a href="https://www.digitalocean.com/">DigitalOcean</a>, initially paid by Paul and then sponsored directly by DigitalOcean itself.
                </p>

                <p>
                    In October 2018, the API was converted to serve static JSON
                    files in a fully backwards compatible manner. This allowed
                    PokéAPI to move its hosting to a cheap static hosting
                    solution (<a href="https://firebase.google.com/">Firebase</a> Hosting + <a href="https://www.cloudflare.com/">Cloudflare</a> Caching), which
                    increased performance and stability by a huge margin.
                </p>
                
                <p>
                    The move to static hosting was solved by introducing a build step before deployment performed by <a href="https://circleci.com/">CircleCI</a>, our build system. This build step starts a local Django copy of <a href="https://github.com/PokeAPI/pokeapi">PokeAPI/pokeapi</a> and saves each possible endpoint as a JSON file using <a href="https://github.com/PokeAPI/ditto">PokeAPI/ditto</a>. All these JSON files are then uploaded to Firebase and served to the public through a <a href="https://github.com/PokeAPI/deploy">Firebase function</a> actioned by CircleCI.
                </p>
                
                <p>
                    This website now uses <a href="https://github.com/react-static/react-static">React Static</a> and the code lives in its own GitHub project at <a href="https://github.com/PokeAPI/pokeapi.co">PokeAPI/pokeapi.co</a>. Again, CircleCI takes care of deploying it on Firebase as static files.
                </p>
                <p>
                    <strong>Average at Best Battle League Platform:</strong> The league platform and this documentation 
                    site were architected and developed by <strong>Simeon Bowman</strong> under <strong>MOODMNKY LLC</strong>. 
                    The platform uses a self-hosted instance of PokéAPI for optimal performance and reliability, 
                    ensuring fast data access for all league features. The implementation includes a Next.js application 
                    with Supabase backend, Docker-based service orchestration, battle simulation infrastructure, Discord 
                    integration, and this custom-themed API documentation site—all designed specifically to enhance the 
                    competitive experience for Average at Best Battle League coaches.
                </p>
            </Faq>
        </PlainPage>
    );
}
