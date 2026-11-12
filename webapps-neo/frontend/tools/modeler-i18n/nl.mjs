/**
 * Dutch (nl-NL) canvas dictionary: the palette / context pad / replace menu
 * entries plus the properties panel.
 *
 * Terminology follows the Dutch BPMN literature: taak (task), subproces,
 * poort (gateway), gebeurtenis (event), sequentiestroom (sequence flow),
 * uitvoeringsluisteraar / taakluisteraar (the two listener kinds),
 * jobwerker (job worker).
 *
 * Placeholders are kept verbatim: substitution runs against the *value*, not the
 * key, so `${someDate}` and `{eventType}` must survive unchanged.
 */
export const NL = {
  ",": ",",
  ") to identify the error.": ") om de fout te identificeren.",
  ") to match a specific error, or leave empty to catch any error.":
    ") om op een specifieke fout te letten, of laat leeg om elke fout te vangen.",
  ").": ").",
  "{eventType}: {type}": "{eventType}: {type}",
  "<custom type>": "<aangepast type>",
  "<empty>": "<leeg>",
  "<none>": "<geen>",
  "1 hour and 30 minutes": "1 uur en 30 minuten",
  "14 days": "14 dagen",
  "15 seconds": "15 seconden",
  "A cycle defined as ISO 8601 repeating intervals format, or a cron expression.":
    "Een cyclus in het ISO 8601-formaat voor herhalende intervallen, of een cron-expressie.",
  "A cycle defined as ISO 8601 repeating intervals format.":
    "Een cyclus in het ISO 8601-formaat voor herhalende intervallen.",
  "A FEEL expression that determines whether the event should trigger.":
    "Een FEEL-expressie die bepaalt of de gebeurtenis moet worden geactiveerd.",
  "A specific point in time defined as ISO 8601 combined date and time representation.":
    "Een specifiek tijdstip volgens de gecombineerde datum- en tijdnotatie van ISO 8601.",
  "A time duration defined as ISO 8601 durations format.":
    "Een tijdsduur in het ISO 8601-formaat voor duur.",
  "About conditional events.": "Over voorwaardelijke gebeurtenissen.",
  "Activate create/remove space tool":
    "Gereedschap voor ruimte maken/verwijderen activeren",
  "Activate global connect tool": "Gereedschap globaal verbinden activeren",
  "Activate hand tool": "Gereedschap hand activeren",
  "Activate lasso tool": "Gereedschap lasso activeren",
  "Active elements": "Actieve elementen",
  "Active elements collection": "Verzameling actieve elementen",
  "Activity reference": "Referentie naar activiteit",
  "Ad-hoc subprocess documentation": "Documentatie van ad-hocsubproces",
  "Add custom key-value metadata to this element. Extension properties have no effect on process execution — they can be used to attach configuration visible for other consumers of the BPMN diagram.":
    "Voeg aangepaste sleutel-waarde-metadata toe aan dit element. Uitbreidingseigenschappen hebben geen effect op de uitvoering van het proces; ze kunnen worden gebruikt om configuratie toe te voegen die zichtbaar is voor andere gebruikers van het BPMN-diagram.",
  "Add custom logic that reacts to various events in the workflow execution life-cycle.":
    "Voeg aangepaste logica toe die reageert op verschillende gebeurtenissen in de levenscyclus van de workflowuitvoering.",
  "Add input mappings to control what is passed to the activity as local variables.":
    "Voeg invoermappingen toe om te bepalen wat als lokale variabelen aan de activiteit wordt doorgegeven.",
  "Add lane above": "Baan hierboven toevoegen",
  "Add lane below": "Baan hieronder toevoegen",
  "Add output mappings to control which variables are merged back into the process scope.":
    "Voeg uitvoermappingen toe om te bepalen welke variabelen terug worden samengevoegd in de procesomvang.",
  "Add text annotation": "Tekstannotatie toevoegen",
  "After": "Na",
  "Append business knowledge model": "Bedrijfskennismodel toevoegen",
  "Append compensation activity": "Compensatieactiviteit toevoegen",
  "Append conditional intermediate catch event":
    "Voorwaardelijke tussenliggende wachtgebeurtenis toevoegen",
  "Append decision": "Beslissing toevoegen",
  "Append end event": "Eindegebeurtenis toevoegen",
  "Append gateway": "Poort toevoegen",
  "Append input data": "Invoergegevens toevoegen",
  "Append intermediate/boundary event":
    "Tussenliggende/grensgebeurtenis toevoegen",
  "Append knowledge source": "Kennisbron toevoegen",
  "Append message intermediate catch event":
    "Tussenliggende wachtgebeurtenis voor bericht toevoegen",
  "Append receive task": "Ontvangsttaak toevoegen",
  "Append signal intermediate catch event":
    "Tussenliggende wachtgebeurtenis voor signaal toevoegen",
  "Append task": "Taak toevoegen",
  "Append timer intermediate catch event":
    "Tussenliggende wachtgebeurtenis voor timer toevoegen",
  "Assignee": "Toegewezen aan",
  assignment: "toewijzing",
  Assignment: "Toewijzing",
  "Assignment type": "Type toewijzing",
  "Asynchronous after": "Asynchroon na",
  "Asynchronous before": "Asynchroon vóór",
  "Asynchronous continuations": "Asynchrone vervolgexecuties",
  "Before": "Vóór",
  "Binding": "Binding",
  boolean: "boolean",
  BPMN: "BPMN",
  "Business ID": "Bedrijfs-ID",
  "Business ID propagation documentation":
    "Documentatie over het doorgeven van de bedrijfs-ID",
  "Business key": "Bedrijfssleutel",
  "Business key expression": "Expressie voor bedrijfssleutel",
  "Business rule task documentation":
    "Documentatie van de taak voor bedrijfsregels",
  "Call activity documentation": "Documentatie van de aanroepactiviteit",
  "Called decision": "Aangeroepen beslissing",
  "Called decision documentation":
    "Documentatie van de aangeroepen beslissing",
  "Called element": "Aangeroepen element",
  "Camunda Form": "Camunda-formulier",
  "Camunda Form (embedded)": "Camunda-formulier (ingesloten)",
  "Camunda Form (linked)": "Camunda-formulier (gekoppeld)",
  "Camunda Forms": "Camunda-formulieren",
  "Camunda user task": "Camunda-gebruikerstaak",
  "Cancel remaining instances": "Resterende instanties annuleren",
  "Candidate groups": "Kandidaatgroepen",
  "Candidate starter": "Kandidaatstarter",
  "Candidate starter groups": "Kandidaatstartgroepen",
  "Candidate starter users": "Kandidaatstartgebruikers",
  "Candidate users": "Kandidaatgebruikers",
  "Case ref": "Dossierreferentie",
  "Change element": "Element wijzigen",
  "Change type": "Type wijzigen",
  "Class": "Klasse",
  "Click to remove dynamic value with FEEL expression":
    "Klik om de dynamische waarde met FEEL-expressie te verwijderen",
  "Click to set a dynamic value with FEEL expression":
    "Klik om een dynamische waarde met FEEL-expressie in te stellen",
  CMMN: "CMMN",
  "Code": "Code",
  "Code variable": "Codevariabele",
  "collectEntries (List<Object>)": "collectEntries (List<Object>)",
  "Collection": "Verzameling",
  "Compensation": "Compensatie",
  "complete": "voltooien",
  "Completion": "Voltooiing",
  "Completion condition": "Voltooiingsvoorwaarde",
  "Condition": "Voorwaarde",
  "Condition expression": "Voorwaarde-expressie",
  "Condition Expression": "Voorwaarde-expressie",
  "Conditional event documentation":
    "Documentatie van de voorwaardelijke gebeurtenis",
  "Conditions documentation": "Documentatie van voorwaarden",
  "Config": "Configuratie",
  "Configure the message that the task waits for.":
    "Configureer het bericht waarop de taak wacht.",
  "Configure the message that this event waits for.":
    "Configureer het bericht waarop deze gebeurtenis wacht.",
  "Configure the message that will start this process instance.":
    "Configureer het bericht dat deze procesinstantie start.",
  "Configure the message that will trigger this boundary event.":
    "Configureer het bericht dat deze grensgebeurtenis activeert.",
  "Connect to other element": "Verbinden met ander element",
  "Connect using association": "Verbinden met associatie",
  "Connect using data input association":
    "Verbinden met gegevensinvoerassociatie",
  "Connector ID": "Connector-ID",
  "Connector inputs": "Connectorinvoer",
  "Connector outputs": "Connectoruitvoer",
  "Constraints": "Beperkingen",
  "Control the business ID set on a child process. If left empty, no business ID will be set.":
    "Bepaal de bedrijfs-ID die op een kindproces wordt ingesteld. Als dit leeg blijft, wordt er geen bedrijfs-ID ingesteld.",
  "Control which variables from the called process are merged back into the parent scope. By default, all child variables are propagated; use output mappings to selectively return specific variables.":
    "Bepaal welke variabelen uit het aangeroepen proces terug worden samengevoegd in de bovenliggende omvang. Standaard worden alle kindvariabelen doorgegeven; gebruik uitvoermappingen om selectief specifieke variabelen terug te geven.",
  "create": "creëren",
  "Create": "Aanmaken",
  "Create data object reference": "Referentie naar gegevensobject aanmaken",
  "Create data store reference": "Referentie naar gegevensopslag aanmaken",
  "Create decision": "Beslissing aanmaken",
  "Create end event": "Eindegebeurtenis aanmaken",
  "Create expanded sub-process": "Uitgeklapt subproces aanmaken",
  "Create gateway": "Poort aanmaken",
  "Create group": "Groep aanmaken",
  "Create input data": "Invoergegevens aanmaken",
  "Create intermediate/boundary event":
    "Tussenliggende/grensgebeurtenis aanmaken",
  "Create knowledge model": "Kennismodel aanmaken",
  "Create knowledge source": "Kennisbron aanmaken",
  "Create new ...": "Nieuw aanmaken ...",
  "Create new list item": "Nieuw lijstitem aanmaken",
  "Create pool/participant": "Zwembad/participant aanmaken",
  "Create start event": "Starteenheid aanmaken",
  "Create task": "Taak aanmaken",
  "Created in": "Aangemaakt in",
  "Custom form key": "Aangepaste formulielsleutel",
  "Custom type": "Aangepast type",
  "Cycle": "Cyclus",
  "date": "datum",
  "Date": "Datum",
  "Decision ID": "Beslissings-ID",
  "Decision reference": "Referentie naar beslissing",
  "Default value": "Standaardwaarde",
  "Define a boolean condition expression that determines when this sequence flow is taken.":
    "Definieer een booleaanse voorwaarde-expressie die bepaalt wanneer deze sequentiestroom wordt gevolgd.",
  "Define a collection of elements which will be activated when the ad-hoc subprocess is reached.":
    "Definieer een verzameling elementen die worden geactiveerd wanneer het ad-hocsubproces wordt bereikt.",
  "Define an input collection expression that defines the collection to iterate over (e.g.":
    "Definieer een invoerverzamexpressie die de verzameling bepaalt waarover wordt geïtereerd (bijv.",
  "Define how to collect the outputs of the ad-hoc subprocess. The output collection variable stores the list of results; the output element expression defines what each element contributes.":
    "Definieer hoe de uitvoer van het ad-hocsubproces wordt verzameld. De uitvoerverzamelvariabele bevat de lijst met resultaten; de uitvoerelementexpressie bepaalt wat elk element bijdraagt.",
  "Define static metadata passed to job workers alongside each job. Headers are not evaluated by the engine — use them for fixed worker configuration (e.g.":
    "Definieer statische metadata die samen met elke taak aan jobwerkers wordt doorgegeven. Headers worden niet door de engine geëvalueerd — gebruik ze voor vaste workerconfiguratie (bijv.",
  "Define the assignment, schedule, and priority of the user task. Assignee, candidate groups, and candidate users can be combined. Use due date and follow-up date to express deadlines and urgency.":
    "Definieer de toewijzing, planning en prioriteit van de gebruikerstaak. Toegewezen gebruiker, kandidaatgroepen en kandidaatgebruikers kunnen worden gecombineerd. Gebruik de vervaldatum en de opvolgdatum om deadlines en urgentie aan te geven.",
  "Define the completion behavior of an ad-hoc subprocess. If no completion condition is set, it will be completed after all active elements have been completed.":
    "Definieer het voltooiingsgedrag van een ad-hocsubproces. Als er geen voltooiingsvoorwaarde is ingesteld, wordt het voltooid nadat alle actieve elementen zijn voltooid.",
  "Define the decision to evaluate and how to map back the evaluation result.":
    "Definieer de beslissing die moet worden geëvalueerd en hoe het evaluatieresultaat wordt teruggemapt.",
  "Define the error to catch. Specify an error code (e.g.":
    "Definieer de fout die moet worden gevangen. Geef een foutcode op (bijv.",
  "Define the error to throw. Specify an error code (e.g.":
    "Definieer de fout die moet worden opgeworpen. Geef een foutcode op (bijv.",
  "Define the FEEL expression to evaluate and the variable to store the result in.":
    "Definieer de FEEL-expressie die moet worden geëvalueerd en de variabele waarin het resultaat wordt opgeslagen.",
  "Define the ID of the process to call (e.g.":
    "Definieer de ID van het aan te roepen proces (bijv.",
  "Define the name of the variable that will contain the error code.":
    "Definieer de naam van de variabele die de foutcode bevat.",
  "Define the name of the variable that will contain the error message.":
    "Definieer de naam van de variabele die het foutbericht bevat.",
  "Define the name of the variable that will contain the escalation code.":
    "Definieer de naam van de variabele die de escalatiecode bevat.",
  "Delegate Class": "Gedelegeerde klasse",
  "Delegate expression": "Gedelegeerde expressie",
  "Delegate Expression": "Gedelegeerde expressie",
  "Delegate Variable Mapping": "Gedelegeerde variabelemapping",
  "delete": "verwijderen",
  "Delete": "Verwijderen",
  "Delete item": "Item verwijderen",
  "deployment": "implementatie",
  "Deployment binding": "Implementatiebinding",
  "Divide into three lanes": "In drie banen verdelen",
  "Divide into two lanes": "In twee banen verdelen",
  "DMN decision": "DMN-beslissing",
  "Documentation": "Documentatie",
  "Documentation: Timer events": "Documentatie: timergebeurtenissen",
  "Documentation: Variable events": "Documentatie: variabelegebeurtenissen",
  "Due date": "Vervaldatum",
  "Duration": "Duur",
  "Element documentation": "Documentatie van element",
  "Element variable": "Elementvariabele",
  "Embedded or External Task Forms":
    "Ingesloten of externe taakformulieren",
  "end": "einde",
  "enum": "enum",
  "Error": "Fout",
  "Error event documentation": "Documentatie van de foutgebeurtenis",
  "Errors": "Fouten",
  "Escalation": "Escalatie",
  "Evaluate a business rule, for example a DMN decision. To add a custom implementation, use a job worker.":
    "Evalueer een bedrijfsregel, bijvoorbeeld een DMN-beslissing. Gebruik een jobworker om een aangepaste implementatie toe te voegen.",
  "Event type": "Gebeurtenistype",
  "every 10 seconds, up to 5 times": "elke 10 seconden, maximaal 5 keer",
  "every day, infinitely": "elke dag, oneindig",
  "every hour on the hour from 9-5 p.m. UTC Monday-Friday":
    "elk uur van 9.00 tot 17.00 UTC, maandag tot en met vrijdag",
  "Exclusive": "Exclusief",
  "Executable": "Uitvoerbaar",
  "Execute this task for each element of a given collection.":
    "Voer deze taak uit voor elk element van een bepaalde verzameling.",
  "Execution listeners": "Uitvoeringsluisteraars",
  "Execution listeners documentation":
    "Documentatie van uitvoeringsluisteraars",
  "Expression": "Expressie",
  "Extension properties": "Uitbreidingseigenschappen",
  "External form reference": "Referentie naar extern formulier",
  "External resource": "Externe bron",
  "External task": "Externe taak",
  "FEEL expression": "FEEL-expressie",
  "FEEL expression is mandatory": "FEEL-expressie is verplicht",
  "Field injection": "Veldinjectie",
  "Field injections": "Veldinjecties",
  "Follow up date": "Opvolgdatum",
  "Form": "Formulier",
  "Form fields": "Formuliervelden",
  "Form ID": "Formulier-ID",
  "Form JSON configuration": "JSON-configuratie van formulier",
  "Form key": "Formuliersleutel",
  "Form reference": "Referentie naar formulier",
  "Format": "Indeling",
  "Forms": "Formulieren",
  "General": "Algemeen",
  "Generated Task Forms": "Gegenereerde taakformulieren",
  "Global error reference": "Globale foutreferentie",
  "Global escalation reference": "Globale escalatiereferentie",
  "Global message reference": "Globale berichtreferentie",
  "Global signal reference": "Globale signaalreferentie",
  "Headers": "Headers",
  "History cleanup": "Geschiedenis opschonen",
  "How to configure a timer": "Een timer configureren",
  "ID": "ID",
  "ID must be a valid QName.": "ID moet een geldige QName zijn.",
  "ID must be unique.": "ID moet uniek zijn.",
  "ID must not be empty.": "ID mag niet leeg zijn.",
  "ID must not contain prefix.": "ID mag geen prefix bevatten.",
  "ID must not contain spaces.": "ID mag geen spaties bevatten.",
  "Identifier computed from the process context that is used to correlate an incoming message (e.g.":
    "Identificatie die uit de procescontext wordt berekend en wordt gebruikt om een inkomend bericht te correleren (bijv.",
  "If turned on, all variables from the child process instance will be propagated to the parent process instance.":
    "Indien ingeschakeld worden alle variabelen van de kindprocesinstantie doorgegeven aan de bovenliggende procesinstantie.",
  "If turned on, all variables from the parent process instance will be propagated to the child process instance.":
    "Indien ingeschakeld worden alle variabelen van de bovenliggende procesinstantie doorgegeven aan de kindprocesinstantie.",
  "Implement a script task using an inline FEEL expression. To add a custom implementation, use a job worker.":
    "Implementeer een scripttaak met een inline FEEL-expressie. Gebruik een jobworker om een aangepaste implementatie toe te voegen.",
  "Implement a user task managed by Camunda. To add a custom implementation, use a job worker.":
    "Implementeer een door Camunda beheerde gebruikerstaak. Gebruik een jobworker om een aangepaste implementatie toe te voegen.",
  "Implement the ad-hoc subprocess as a job worker instead of activating inner elements. The job type determines which worker handles the subprocess execution.":
    "Implementeer het ad-hocsubproces als jobworker in plaats van de innerlijke elementen te activeren. Het taaktype bepaalt welke worker de uitvoering van het subproces afhandelt.",
  "Implementation": "Implementatie",
  "Implementation type": "Implementatietype",
  "In mapping propagation": "In-mappingpropagatie",
  "In mappings": "In-mappings",
  "Inherit from parent": "Overnemen van bovenliggend element",
  "Initiator": "Initiator",
  "Inline script": "Inline script",
  "Input collection": "Invoerverzameling",
  "Input element": "Invoerelement",
  "Input mapping": "In-mapping",
  "Input mappings documentation": "Documentatie van in-mappings",
  "Input propagation": "Invoerpropagatie",
  "Inputs": "Invoer",
  "Java class": "Java-klasse",
  "Job execution": "Taakuitvoering",
  "Job priority": "Taakprioriteit",
  "Job priority documentation": "Documentatie van taakprioriteit",
  "Job type": "Taaktype",
  "Job worker": "Jobworker",
  "JSON contains errors": "JSON bevat fouten",
  "Key": "Sleutel",
  "Label": "Label",
  "latest": "nieuwste",
  "Latest binding": "Binding aan nieuwste",
  "Learn how to define conditions.": "Leer voorwaarden definiëren.",
  "Learn more.": "Meer informatie.",
  "Link": "Koppeling",
  "Link a form created with the Camunda Forms editor. Submitting this form will start a new process instance.":
    "Koppel een formulier dat met de Camunda-formuliereneditor is gemaakt. Bij verzending van dit formulier wordt een nieuwe procesinstantie gestart.",
  "Link a form created with the Camunda Forms editor. To associate a custom form, application, or URL to the user task, specify an external reference.":
    "Koppel een formulier dat met de Camunda-formuliereneditor is gemaakt. Geef een externe referentie op om een aangepast formulier, een toepassing of een URL aan de gebruikerstaak te koppelen.",
  "Link or embed a form created with the Camunda Forms editor. To associate a custom form, application, or URL to the user task, specify a form key.":
    "Koppel of sluit een formulier in dat met de Camunda-formuliereneditor is gemaakt. Geef een formuliersleutel op om een aangepast formulier, een toepassing of een URL aan de gebruikerstaak te koppelen.",
  "List": "Lijst",
  "List contains {numOfItems} item": "Lijst bevat {numOfItems} item",
  "List contains {numOfItems} items": "Lijst bevat {numOfItems} items",
  "List values": "Lijstwaarden",
  "Listener ID": "Luisteraar-ID",
  "Listener type": "Luisteraartype",
  "Local": "Lokaal",
  "long": "long",
  "Loop": "Lus",
  "Loop cardinality": "Luscardinaliteit",
  "Map": "Mapping",
  "Map decision result": "Beslissingsresultaat mappen",
  "Map entries": "Mappingitems",
  "Message": "Bericht",
  "Message boundary event documentation":
    "Documentatie van de berichtgrensgebeurtenis",
  "Message catch event documentation":
    "Documentatie van de berichtwachtgebeurtenis",
  "Message start event documentation":
    "Documentatie van de berichtstarteenheid",
  "Message throw event documentation":
    "Documentatie van de berichtverzendgebeurtenis",
  "Message variable": "Berichtvariabele",
  "Multi instance documentation": "Documentatie van multi-instantie",
  "Multi-instance": "Multi-instantie",
  "Multiple elements are selected. Select a single element to edit its properties.":
    "Er zijn meerdere elementen geselecteerd. Selecteer één element om de eigenschappen te bewerken.",
  "Name": "Naam",
  "Number of days before this resource is being cleaned up. If specified, takes precedence over the engine configuration.":
    "Aantal dagen voordat deze bron wordt opgeruimd. Indien opgegeven, heeft dit voorrang op de configuratie van de engine.",
  "Off": "Uit",
  "On": "Aan",
  "Open documentation": "Documentatie openen",
  "Open pop-up editor": "Pop-up-editor openen",
  "Opened in editor": "Geopend in editor",
  "or": "of",
  "Otherwise, only variables defined via input mappings will be propagated.":
    "Anders worden alleen variabelen die via in-mappings zijn gedefinieerd doorgegeven.",
  "Otherwise, only variables defined via output mappings will be propagated.":
    "Anders worden alleen variabelen die via uit-mappings zijn gedefinieerd doorgegeven.",
  "Out mapping propagation": "Uit-mappingpropagatie",
  "Out mappings": "Uit-mappings",
  "Output collection": "Uitvoerverzameling",
  "Output element": "Uitvoerelement",
  "Output mapping": "Uit-mapping",
  "Output mappings documentation": "Documentatie van uit-mappings",
  "Output propagation": "Uitvoerpropagatie",
  "Outputs": "Uitvoer",
  "Parallel multi-instance": "Parallelle multi-instantie",
  "Participant multiplicity": "Multipliciteit van participant",
  "Participant Name": "Naam van participant",
  "Priority": "Prioriteit",
  "Process documentation": "Documentatie van proces",
  "Process ID": "Proces-ID",
  "Process name": "Naam van proces",
  "Process variables": "Procesvariabelen",
  "Propagate all child process variables":
    "Alle variabelen van het kindproces doorgeven",
  "Propagate all parent process variables":
    "Alle variabelen van het bovenliggende proces doorgeven",
  "Propagate all variables": "Alle variabelen doorgeven",
  "Properties": "Eigenschappen",
  "React to user task lifecycle events by executing a job worker.":
    "Reageer op gebeurtenissen in de levenscyclus van de gebruikerstaak door een jobworker uit te voeren.",
  "Receive task message documentation":
    "Documentatie van het bericht van de ontvangsttaak",
  "Refers to the process variable name":
    "Verwijst naar de naam van de procesvariabele",
  "Resource": "Bron",
  "Result variable": "Resultaatvariabele",
  "resultList (List<Map<String, Object>>)":
    "resultList (List<Map<String, Object>>)",
  "Retries": "Nieuwe pogingen",
  "Retry time cycle": "Cyclus voor nieuwe pogingen",
  "Scope": "Omvang",
  "Script": "Script",
  "Script task documentation": "Documentatie van de scripttaak",
  "Script type": "Scripttype",
  "Section contains a warning": "Sectie bevat een waarschuwing",
  "Section contains an error": "Sectie bevat een fout",
  "Section contains edits": "Sectie bevat wijzigingen",
  "Select an element to edit its properties.":
    "Selecteer een element om de eigenschappen te bewerken.",
  "Send task documentation": "Documentatie van de verzendtaak",
  "Sequential multi-instance": "Sequentiële multi-instantie",
  "Service task documentation": "Documentatie van de servicetaak",
  "Signal": "Signaal",
  "singleEntry (TypedValue)": "singleEntry (TypedValue)",
  "singleResult (Map<String, Object>)":
    "singleResult (Map<String, Object>)",
  "Source": "Bron",
  "Source expression": "Bronexpressie",
  "Specifies the default priority for all jobs created by a process. Must be an integer. If no value is provided, the default value is 0.":
    "Specificeert de standaardprioriteit van alle taken die door een proces worden gemaakt. Moet een geheel getal zijn. Als er geen waarde wordt opgegeven, is de standaardwaarde 0.",
  "Specifies the priority of a job. Must be an integer. If no value is provided, the default value is 0.":
    "Specificeert de prioriteit van een taak. Moet een geheel getal zijn. Als er geen waarde wordt opgegeven, is de standaardwaarde 0.",
  "Specifies the priority of a user task. Must be an integer between 0 and 100. If no value is provided, the default value is 50.":
    "Specificeert de prioriteit van een gebruikerstaak. Moet een geheel getal tussen 0 en 100 zijn. Als er geen waarde wordt opgegeven, is de standaardwaarde 50.",
  "Specify more than one group as a comma separated list.":
    "Geef meer dan één groep op als een door komma's gescheiden lijst.",
  "Specify more than one user as a comma separated list.":
    "Geef meer dan één gebruiker op als een door komma's gescheiden lijst.",
  "Specify more than one variable change event as a comma separated list. Variable change events are:":
    "Geef meer dan één variabelewijzigingsgebeurtenis op als een door komma's gescheiden lijst. Variabelewijzigingsgebeurtenissen zijn:",
  "Specify the condition that triggers this event.":
    "Geef de voorwaarde op die deze gebeurtenis activeert.",
  "Specify which job workers handle the event work.":
    "Geef aan welke jobwerkers het werk van de gebeurtenis afhandelen.",
  "Specify which job workers handle the task work to evaluate business rules.":
    "Geef aan welke jobwerkers het taakwerk afhandelen om bedrijfsregels te evalueren.",
  "Specify which job workers handle the task work to execute a script.":
    "Geef aan welke jobwerkers het taakwerk afhandelen om een script uit te voeren.",
  "Specify which job workers handle the task work to execute a service (e.g.":
    "Geef aan welke jobwerkers het taakwerk afhandelen om een service uit te voeren (bijv.",
  "Specify which job workers handle the task work to send a message (e.g.":
    "Geef aan welke jobwerkers het taakwerk afhandelen om een bericht te verzenden (bijv.",
  "start": "start",
  "Start event form documentation":
    "Documentatie van het formulier van de starteenheid",
  "Start initiator": "Startinitiator",
  "Start typing \"${}\" to create an expression.":
    "Begin met typen van \"${}\" om een expressie te maken.",
  "Startable": "Startbaar",
  "string": "string",
  "String": "String",
  "String or expression": "String of expressie",
  "Subscription correlation key": "Correlatiesleutel van abonnement",
  "Subscription correlation key documentation":
    "Documentatie van de correlatiesleutel van het abonnement",
  "take": "nemen",
  "Target": "Doel",
  "Task definition": "Taakdefinitie",
  "Task headers documentation": "Documentatie van taakheaders",
  "Task listeners": "Taakluisteraars",
  "Task listeners documentation": "Documentatie van taakluisteraars",
  "Tasklist": "Takenlijst",
  "Tenant ID": "Tenant-ID",
  "The due date as an EL expression (e.g. ${someDate}) or an ISO date (e.g. 2015-06-26T09:54:00).":
    "De vervaldatum als EL-expressie (bijv. ${someDate}) of ISO-datum (bijv. 2015-06-26T09:54:00).",
  "The number of times the engine tries executing this activity if a worker signals a failure. The default is three.":
    "Het aantal keren dat de engine deze activiteit probeert uit te voeren wanneer een worker een fout meldt. De standaardwaarde is drie.",
  "This maps to the process definition key.":
    "Dit komt overeen met de sleutel van de procesdefinitie.",
  "Throw expression": "Opwerpexpressie",
  "Time to live": "Tijd tot leven",
  "timeout": "tijdslimiet",
  "Timer": "Timer",
  "Timer documentation": "Documentatie van timer",
  "To collect the output define the output collection and the output element expressions.":
    "Definieer om de uitvoer te verzamelen de uitvoerverzameling en de uitvoerelementexpressies.",
  "Toggle list item": "Lijstitem aan/uitzetten",
  "Toggle non-interrupting": "Niet-onderbrekend aan/uitzetten",
  "Toggle section": "Sectie aan/uitzetten",
  "Topic": "Onderwerp",
  "Type": "Type",
  "Unparsable FEEL expression.": "FEEL-expressie kan niet worden geparseerd.",
  "update": "bijwerken",
  "Update": "Bijwerken",
  "User assignment": "Gebruikerstoewijzing",
  "User task documentation": "Documentatie van de gebruikerstaak",
  "User task form documentation":
    "Documentatie van het formulier van de gebruikerstaak",
  "User task priority documentation":
    "Documentatie van de prioriteit van de gebruikerstaak",
  "Uses the most recent deployed resource with the given version tag.":
    "Gebruikt de meest recent geïmplementeerde bron met het opgegeven versielabel.",
  "Uses the most recent deployed resource.":
    "Gebruikt de meest recent geïmplementeerde bron.",
  "Uses the resource found in the same deployment.":
    "Gebruikt de bron die in dezelfde implementatie is gevonden.",
  "UTC plus 2 hours zone offset": "Zone-offset UTC plus 2 uur",
  "UTC time": "UTC-tijd",
  "Value": "Waarde",
  "Values": "Waarden",
  "Variable assignment value": "Waarde van variabeletoewijzing",
  "Variable events": "Variabelegebeurtenissen",
  "Variable events that trigger the condition evaluation. If none selected, all variable events will trigger the condition evaluation.":
    "Variabelegebeurtenissen die de evaluatie van de voorwaarde activeren. Als er geen zijn geselecteerd, activeren alle variabelegebeurtenissen de evaluatie van de voorwaarde.",
  "Variable name": "Naam van variabele",
  "version": "versie",
  "Version": "Versie",
  "version tag": "versielabel",
  "Version tag": "Versielabel",
  "Version tag binding": "Binding van versielabel",
  "Version tag by which the called decision will be referenced.":
    "Versielabel waarnaar de aangeroepen beslissing wordt verwezen.",
  "Version tag by which the called process will be referenced.":
    "Versielabel waarnaar het aangeroepen proces wordt verwezen.",
  "Version tag by which the linked form will be referenced.":
    "Versielabel waarnaar het gekoppelde formulier wordt verwezen.",
  "Version tag by which this process can be referenced.":
    "Versielabel waarnaar dit proces kan worden verwezen.",
  versionTag: "versionTag",
  "Wait for completion": "Wachten op voltooiing",
};