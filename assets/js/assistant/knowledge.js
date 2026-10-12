// Editorial facts from the parish's published contacts and visitor information.
// Opening time confirmed by the rector on 2026-10-12: open from 07:45 on days of services.
// Review these facts when the parish changes its details. Questions are never stored.
export const PARISH = Object.freeze({
  phone: '+37063693506', displayPhone: '+370 636 93506',
  address: 'Sodų g. 8, Bukiškis, LT-14180, Lietuva',
  map: 'https://www.google.com/maps/dir/?api=1&destination=54.76091%2C25.207621',
  reviewed: '2026-10-12',
  sources: ['https://bukiski-hram.net/ru/contacts.html', 'https://bukiski-hram.org/ru/contacts.html', 'https://bukiski-hram.net/ru/sacraments.html']
});

export const FAQ = {
  hours: {
    page: 'contacts',
    ru: 'В дни богослужений храм открыт с 07:45. Время начала служб смотрите в расписании; о посещении вне службы договоритесь по телефону прихода.',
    lt: 'Pamaldų dienomis cerkvė atidaryta nuo 07:45. Pamaldų pradžios laiką rasite tvarkaraštyje; dėl apsilankymo ne pamaldų metu susitarkite telefonu.',
    en: 'On days of services the church is open from 07:45. Service start times are in the schedule; to visit outside services, please call the parish.',
    pl: 'W dni nabożeństw cerkiew jest otwarta od 07:45. Godziny rozpoczęcia nabożeństw są w harmonogramie; wizytę poza nabożeństwem uzgodnij telefonicznie.',
    de: 'An Gottesdiensttagen ist die Kirche ab 07:45 Uhr geöffnet. Die Anfangszeiten stehen im Plan; einen Besuch außerhalb der Gottesdienste vereinbaren Sie bitte telefonisch.',
    uk: 'У дні богослужінь храм відкритий з 07:45. Час початку служб дивіться в розкладі; про відвідування поза службою домовтеся телефоном.'
  },
  sacraments: {
    page: 'sacraments',
    ru: 'Подготовку к крещению, венчанию, исповеди и Причастию, а также дату и порядок совершения треб нужно обсудить со священником. Позвоните в приход; основные сведения собраны в разделе «Таинства».',
    lt: 'Pasirengimą krikštui, santuokai, išpažinčiai ir Komunijai, taip pat apeigų datą bei tvarką aptarkite su kunigu. Paskambinkite į parapiją; bendrą informaciją rasite sakramentų skyriuje.',
    en: 'Please discuss preparation for baptism, marriage, confession and Communion, as well as dates and arrangements, with the priest. Call the parish; general information is on the sacraments page.',
    pl: 'Przygotowanie do chrztu, ślubu, spowiedzi i Komunii oraz terminy i przebieg obrzędów omów z kapłanem. Zadzwoń do parafii; ogólne informacje są w dziale sakramentów.',
    de: 'Vorbereitung auf Taufe, Trauung, Beichte und Kommunion sowie Termine und Abläufe besprechen Sie bitte mit dem Priester. Rufen Sie die Gemeinde an; allgemeine Informationen stehen auf der Sakramentenseite.',
    uk: 'Підготовку до хрещення, вінчання, сповіді та Причастя, а також дату й порядок звершення треб потрібно обговорити зі священником. Зателефонуйте до парафії; загальні відомості є в розділі «Таїнства».'
  },
  notes: {
    page: 'notes',
    ru: 'Записку о здравии или об упокоении можно подготовить в разделе «Подать записку»: отправить через форму, распечатать или передать в храме. Этот помощник записки не принимает — имена вводите только в специальной форме.',
    lt: 'Maldos raštelį už gyvuosius ar mirusiuosius galite parengti atskirame puslapyje: išsiųsti per formą, atsispausdinti arba perduoti cerkvėje. Šis pagalbininkas raštelių nepriima – vardus rašykite tik specialioje formoje.',
    en: 'Use the prayer-note page to prepare a note for the living or departed, submit it through the form, print it or bring it to church. This assistant does not accept prayer notes; enter names only in the dedicated form.',
    pl: 'Kartkę za żywych lub zmarłych przygotujesz na osobnej stronie: wyślesz przez formularz, wydrukujesz lub przekażesz w cerkwi. Pomocnik nie przyjmuje kartek – imiona wpisuj tylko w specjalnym formularzu.',
    de: 'Auf der Gebetszettelseite können Sie einen Zettel für Lebende oder Verstorbene vorbereiten, über das Formular senden, ausdrucken oder zur Kirche bringen. Der Assistent nimmt keine Gebetszettel an; Namen gehören nur in das vorgesehene Formular.',
    uk: 'Записку за здоров’я або за упокій можна підготувати на окремій сторінці: надіслати через форму, роздрукувати або передати в храмі. Цей помічник записок не приймає — імена вводьте лише у спеціальній формі.'
  },
  history: {
    page: 'history',
    ru: 'Храм Рождества Христова находится в Букишках, Вильнюсском районе. История основания, восстановления и современной жизни прихода опубликована в разделе «О храме».',
    lt: 'Kristaus Gimimo cerkvė yra Bukiškyje, Vilniaus rajone. Jos įkūrimo, atkūrimo ir dabartinio parapijos gyvenimo istorija pateikta istorijos skyriuje.',
    en: 'The Church of the Nativity of Christ is in Bukiškis, Vilnius district. Read about its foundation, restoration and parish life on the history page.',
    pl: 'Cerkiew Narodzenia Chrystusa znajduje się w Bukiškis, w rejonie wileńskim. Historię jej powstania, odbudowy i życia parafii znajdziesz w dziale historii.',
    de: 'Die Christi-Geburtskirche liegt in Bukiškis im Bezirk Vilnius. Die Geschichte ihrer Gründung, Wiederherstellung und des Gemeindelebens finden Sie auf der Geschichtsseite.',
    uk: 'Храм Різдва Христового розташований у Букішках, Вільнюському районі. Історія заснування, відновлення та життя парафії опублікована в розділі про храм.'
  },
  visit: {
    page: 'contacts',
    ru: 'Выберите службу в расписании. Если вы впервые идёте в храм или хотите поговорить со священником, можно заранее позвонить в приход.',
    lt: 'Pasirinkite pamaldas tvarkaraštyje. Jei lankotės pirmą kartą arba norite pasikalbėti su kunigu, galite iš anksto paskambinti į parapiją.',
    en: 'Choose a service from the schedule. If this is your first visit or you would like to speak to the priest, you can call the parish in advance.',
    pl: 'Wybierz nabożeństwo z harmonogramu. Jeśli przychodzisz po raz pierwszy lub chcesz porozmawiać z kapłanem, możesz wcześniej zadzwonić do parafii.',
    de: 'Wählen Sie einen Gottesdienst aus dem Plan. Bei einem ersten Besuch oder für ein Gespräch mit dem Priester können Sie die Gemeinde vorher anrufen.',
    uk: 'Виберіть службу в розкладі. Якщо йдете до храму вперше або хочете поговорити зі священником, можна заздалегідь зателефонувати до парафії.'
  }
};
