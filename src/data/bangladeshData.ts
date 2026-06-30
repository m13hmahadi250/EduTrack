export const BANGLADESH_DIVISIONS: string[] = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh"
];

export const BANGLADESH_DIV_TO_DIST: Record<string, string[]> = {
  "Dhaka": [
    "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", 
    "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", 
    "Narsingdi", "Rajbari", "Shariatpur", "Tangail"
  ],
  "Chattogram": [
    "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", 
    "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"
  ],
  "Rajshahi": [
    "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", 
    "Pabna", "Rajshahi", "Sirajganj"
  ],
  "Khulna": [
    "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", 
    "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"
  ],
  "Barishal": [
    "Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"
  ],
  "Sylhet": [
    "Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"
  ],
  "Rangpur": [
    "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", 
    "Panchagarh", "Rangpur", "Thakurgaon"
  ],
  "Mymensingh": [
    "Jamalpur", "Mymensingh", "Netrokona", "Sherpur"
  ]
};

// All 64 districts in one flat list for backwards compatibility
export const BANGLADESH_DISTRICTS: string[] = [
  // Dhaka Division
  "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail",
  // Chattogram Division
  "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati",
  // Rajshahi Division
  "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj",
  // Khulna Division
  "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira",
  // Barishal Division
  "Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur",
  // Sylhet Division
  "Habiganj", "Moulvibazar", "Sunamganj", "Sylhet",
  // Rangpur Division
  "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon",
  // Mymensingh Division
  "Jamalpur", "Mymensingh", "Netrokona", "Sherpur"
];

export const BANGLADESH_THANAS: Record<string, string[]> = {
  // DHAKA DIVISION
  "Dhaka": [
    "Mirpur", "Uttara", "Dhanmondi", "Gulshan", "Banani", "Badda", "Motijheel", 
    "Khilgaon", "Paltan", "Ramna", "Shahbagh", "Lalbagh", "Tejgaon", "Mohammadpur", 
    "Savar", "Keraniganj", "Dhamrai"
  ],
  "Faridpur": [
    "Sadar", "Madhukhali", "Boalmari", "Alfadanga", "Saltha", "Bhanga", "Sadarpur", "Charbhadrasan", "Nagarkanda"
  ],
  "Gazipur": [
    "Sadar", "Tongi", "Kaliakair", "Sreepur", "Kapasia", "Kaliganj"
  ],
  "Gopalganj": [
    "Sadar", "Tungipara", "Kotalipara", "Kashiani", "Muksudpur"
  ],
  "Kishoreganj": [
    "Sadar", "Karimganj", "Tarail", "Itna", "Mithamain", "Nikli", "Astagram", "Bajitpur", "Kuliarchar", "Bhairab", "Katiadi", "Pakundia", "Hossainpur"
  ],
  "Madaripur": [
    "Sadar", "Kalkini", "Rajoir", "Shibchar"
  ],
  "Manikganj": [
    "Sadar", "Singair", "Shibalaya", "Harirampur", "Ghior", "Daulatpur", "Saturia"
  ],
  "Munshiganj": [
    "Sadar", "Tongibari", "Sreenagar", "Louhajang", "Gajaria", "Sirajdikhan"
  ],
  "Narayanganj": [
    "Sadar", "Bandar", "Fatullah", "Siddhirganj", "Rupganj", "Araihazar"
  ],
  "Narsingdi": [
    "Sadar", "Belabo", "Monohardi", "Shibpur", "Raipura", "Palash"
  ],
  "Rajbari": [
    "Sadar", "Goalanda", "Pangsha", "Baliakandi", "Kalukhali"
  ],
  "Shariatpur": [
    "Sadar", "Naria", "Jajira", "Gosairhat", "Damudya", "Bhedarganj"
  ],
  "Tangail": [
    "Sadar", "Basail", "Delduar", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Dhanbari", "Bhuapur"
  ],

  // CHATTOGRAM DIVISION
  "Bandarban": [
    "Sadar", "Alikadam", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi", "Lama"
  ],
  "Brahmanbaria": [
    "Sadar", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Akhauara", "Bijoynagar"
  ],
  "Chandpur": [
    "Sadar", "Hajiganj", "Shahrasti", "Kachua", "Faridganj", "Haimchar", "Matlab North", "Matlab South"
  ],
  "Chattogram": [
    "Akbar Shah", "Bakalia", "Bandar", "Bayazid Bostami", "Chandgaon", "Chawkbazar", "Kotwali", 
    "Double Mooring", "EPZ", "Halishahar", "Khulshi", "Pahartali", "Panchlaish", "Patenga", 
    "Sadarghat", "Karnaphuli", "Mirsharai", "Jorarganj", "Sitakunda", "Sandwip", "Hathazari", 
    "Raozan", "Rangunia", "South Rangunia", "Boalkhali", "Patiya", "Anwara", "Chandanaish", 
    "Satkania", "Lohagara", "Banshkhali", "Fatikchhari", "Bhujpur"
  ],
  "Cumilla": [
    "Kotwali", "Sadar South", "Laksam", "Chauddagram", "Daudkandi", "Debidwar", "Barura", 
    "Chandina", "Homna", "Muradnagar", "Langalkot", "Meghna", "Titas", "Monohorganj", 
    "Burichang", "Brahmanpara"
  ],
  "Cox's Bazar": [
    "Sadar", "Ramu", "Chokoria", "Ukhiya", "Teknaf", "Pekua", "Kutubdia", "Maheshkhali"
  ],
  "Feni": [
    "Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonagazi", "Fulgazi"
  ],
  "Khagrachhari": [
    "Sadar", "Dighinala", "Panchhari", "Laxmichhari", "Mahalchhari", "Manikchhari", "Ramgarh", "Guimara", "Matiranga"
  ],
  "Lakshmipur": [
    "Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"
  ],
  "Noakhali": [
    "Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"
  ],
  "Rangamati": [
    "Sadar", "Belaichhari", "Bagaichhari", "Barkal", "Juraichhari", "Langadu", "Naniarchar", "Rajasthali", "Kaptai", "Kawkhali"
  ],

  // RAJSHAHI DIVISION
  "Bogura": [
    "Sadar", "Shajahanpur", "Sherpur", "Gabtoli", "Kahoo", "Shibganj", "Dupchanchia", "Adamdighi", "Dhunat", "Nandigram", "Sariakandi", "Sonatola"
  ],
  "Joypurhat": [
    "Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"
  ],
  "Naogaon": [
    "Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"
  ],
  "Natore": [
    "Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"
  ],
  "Chapainawabganj": [
    "Sadar", "Shibganj", "Gomastapur", "Nachole", "Bholahat"
  ],
  "Pabna": [
    "Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"
  ],
  "Rajshahi": [
    "Boalia", "Matihar", "Rajputra", "Shah Makhdum", "Bagha", "Puthia", "Godagari", "Tanore", "Bagmara", "Charghat", "Durgapur", "Mohanpur"
  ],
  "Sirajganj": [
    "Sadar", "Belkuchi", "Chouhali", "Kamarkhanda", "Kazipur", "Rayganj", "Shahjadpur", "Tarash", "Ullahpara"
  ],

  // KHULNA DIVISION
  "Bagerhat": [
    "Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"
  ],
  "Chuadanga": [
    "Sadar", "Alamdanga", "Damurhuda", "Jibannagar"
  ],
  "Jashore": [
    "Sadar", "Abhaynagar", "Bagherpara", "Chougachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"
  ],
  "Jhenaidah": [
    "Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"
  ],
  "Khulna": [
    "Kotwali", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Rupsha", "Dumuria", 
    "Phultala", "Batiaghata", "Dacope", "Dighalia", "Koyra", "Paikgachha", "Terokhada"
  ],
  "Kushtia": [
    "Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Daulatpur", "Bheramara"
  ],
  "Magura": [
    "Sadar", "Mohammadpur", "Shalikha", "Sreepur"
  ],
  "Meherpur": [
    "Sadar", "Mujibnagar", "Gangni"
  ],
  "Narail": [
    "Sadar", "Lohagara", "Kalia"
  ],
  "Satkhira": [
    "Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"
  ],

  // BARISHAL DIVISION
  "Barguna": [
    "Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"
  ],
  "Barishal": [
    "Kotwali", "Bandar", "Kawnia", "Airport", "Babuganj", "Bakerganj", "Banaripara", "Gournadi", "Wazirpur", "Agailjhara", "Hijla", "Mehendiganj", "Muladi"
  ],
  "Bhola": [
    "Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"
  ],
  "Jhalokati": [
    "Sadar", "Kathalia", "Nalchity", "Rajapur"
  ],
  "Patuakhali": [
    "Sadar", "Bauphal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Dumki", "Rangabali"
  ],
  "Pirojpur": [
    "Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Indurkani"
  ],

  // SYLHET DIVISION
  "Habiganj": [
    "Sadar", "Bahubal", "Madhabpur", "Chunarughat", "Lakhai", "Nabiganj", "Ajmiriganj", "Baniachong", "Shayestaganj"
  ],
  "Moulvibazar": [
    "Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"
  ],
  "Sunamganj": [
    "Sadar", "South Sunamganj", "Chatak", "Jagannathpur", "Derai", "Sullah", "Tahirpur", "Bishwamandarpur", "Duarabazar", "Jamalganj", "Dharmapasha"
  ],
  "Sylhet": [
    "Kotwali", "Shahporan", "South Surma", "Beanibazar", "Golapganj", "Jaintiapur", "Balaganj", "Fenchuganj", "Bishwanath", "Companiganj", "Gowainghat", "Kanaighat", "Zakiganj"
  ],

  // RANGPUR DIVISION
  "Dinajpur": [
    "Sadar", "Birganj", "Kaharole", "Bochaganj", "Khansama", "Chirirbandar", "Parbatipur", "Phulbari", "Nawabganj", "Hakimpur", "Birol", "Ghoraghat", "Biral"
  ],
  "Gaibandha": [
    "Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Sundarganj", "Saghata", "Phulchhari"
  ],
  "Kurigram": [
    "Sadar", "Bhurungamari", "Phulbari", "Rajarhat", "Ulipur", "Chilmari", "Rowmari", "Char Rajibpur", "Nageshwari"
  ],
  "Lalmonirhat": [
    "Sadar", "Aditmari", "Kaliganj", "Hatibandha", "Patgram"
  ],
  "Nilphamari": [
    "Sadar", "Saidpur", "Jaldhaka", "Domar", "Dimla", "Kishoreganj"
  ],
  "Panchagarh": [
    "Sadar", "Boda", "Debiganj", "Atwari", "Tetulia"
  ],
  "Rangpur": [
    "Kotwali", "Tajhat", "Haragach", "Mahiganj", "Mithapukur", "Pirganj", "Badarganj", "Gangachara", "Kaunia", "Taraganj", "Pirgachha"
  ],
  "Thakurgaon": [
    "Sadar", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"
  ],

  // MYMENSINGH DIVISION
  "Jamalpur": [
    "Sadar", "Bakshiganj", "Dewanganj", "Isampur", "Madarganj", "Melandaha", "Sarishabari"
  ],
  "Mymensingh": [
    "Kotwali", "Trishal", "Muktagachha", "Bhaluka", "Gafargaon", "Ishwarganj", "Haluaghat", "Phulpur", "Phulbaria", "Nandail", "Gouripur", "Dhobaura", "Tara Khanda"
  ],
  "Netrokona": [
    "Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Purbadhala"
  ],
  "Sherpur": [
    "Sadar", "Nakla", "Nalitabari", "Jhenaigati", "Sreebardi"
  ]
};
