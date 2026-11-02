# Dennis Standaard Tijd

Dennis appt "ben er over een half uur" en staat vervolgens een uur en tien minuten later dan beloofd voor de deur. Deze pagina rekent om wat hij appt naar wanneer hij er echt is.

## Wat erin zit

- Getekende Dennis in zijn tuinstoel, op zijn telefoon (SVG met CSS-animatie)
- Aankomstbord met klapcijfers: belofte, verwachting, minuten te laat en een smoes
- Kansverdeling van 4.000 nagespeelde Dennissen, met de kans dat hij op tijd is
- Dennis volgen: aftelklok en wat hij onderweg allemaal doet
- Logboek: elke aankomst of afzegging stelt de Dennis-factor bij en blijft bewaard in `localStorage`

## Draaien

Geen build nodig. Open `index.html` in een browser, of start een lokale server:

```sh
python3 -m http.server 8000
```

## Hoe de voorspelling werkt

- **Beste gok** = beloofde minuten × Dennis-factor × zinsfactor (“bijna” weegt zwaarder dan “half uur”).
- **Dennis-factor** = geometrisch gemiddelde van werkelijk ÷ beloofd over alle aankomsten in het logboek.
- **Spreiding**: lognormaal, σ tussen 0,45 en 0,6 per zin.
- **Afzegkans** = aandeel afzeggingen in het logboek, minimaal 3%.

Het logboek begint met voorbeeldregels; die haal je weg met de knop onder de tabel.
