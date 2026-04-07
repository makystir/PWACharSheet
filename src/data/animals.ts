import type { AnimalTemplate } from '../types/character';

export const ANIMAL_TEMPLATES: AnimalTemplate[] = [
  {name:"Dog",species:"Dog",M:4,WS:25,BS:0,S:20,T:20,I:35,Ag:30,Dex:0,Int:15,WP:10,Fel:15,W:5,
    traits:"Bestial, Night Vision, Skittish, Size (Small), Stride, Weapon+5",
    trained:[], notes:"Loyal companion. Can be trained: Broken, Entertain, Fetch, Guard, Magic, War"},
  {name:"War Dog",species:"Dog",M:4,WS:35,BS:0,S:25,T:25,I:35,Ag:30,Dex:0,Int:15,WP:15,Fel:10,W:8,
    traits:"Bestial, Night Vision, Size (Small), Stride, Territorial, Weapon+5, Trained (Broken, War)",
    trained:["Broken","War"], notes:"Trained for combat. +10 WS from War training."},
  {name:"Wolf",species:"Wolf",M:4,WS:35,BS:0,S:35,T:30,I:35,Ag:30,Dex:0,Int:15,WP:15,Fel:0,W:10,
    traits:"Armour 1, Bestial, Night Vision, Skittish, Stride, Tracker, Weapon+6",
    trained:[], notes:"Can be trained: Broken, Drive, Fetch, Guard, Magic, Mount, War"},
  {name:"Horse",species:"Horse",M:7,WS:25,BS:0,S:45,T:35,I:15,Ag:30,Dex:0,Int:10,WP:10,Fel:10,W:22,
    traits:"Bestial, Size (Large), Skittish, Stride, Weapon+7",
    trained:[], notes:"Can be trained: Broken, Drive, Entertain, Magic, Mount, War"},
  {name:"Riding Horse",species:"Horse",M:7,WS:25,BS:0,S:45,T:35,I:15,Ag:30,Dex:0,Int:10,WP:10,Fel:10,W:22,
    traits:"Bestial, Size (Large), Stride, Weapon+7, Trained (Broken, Mount)",
    trained:["Broken","Mount"], notes:"Standard riding horse."},
  {name:"Destrier (Warhorse)",species:"Horse",M:7,WS:35,BS:0,S:45,T:40,I:15,Ag:30,Dex:0,Int:10,WP:15,Fel:10,W:26,
    traits:"Bestial, Size (Large), Stride, Weapon+7, Trained (Broken, Mount, War)",
    trained:["Broken","Mount","War"], notes:"Trained warhorse. +10 WS from War."},
  {name:"Hawk / Falcon",species:"Hawk",M:2,WS:35,BS:0,S:10,T:10,I:50,Ag:55,Dex:0,Int:15,WP:25,Fel:0,W:3,
    traits:"Bestial, Flight 80, Night Vision, Size (Tiny), Weapon+3",
    trained:[], notes:"Excellent scout. Can be trained: Broken, Fetch, Guard, Home"},
  {name:"Bear",species:"Bear",M:4,WS:35,BS:0,S:55,T:45,I:20,Ag:25,Dex:15,Int:10,WP:15,Fel:0,W:28,
    traits:"Armour 1, Bestial, Bite+9, Night Vision, Size (Large), Skittish, Stride, Weapon+8",
    trained:[], notes:"Can be trained: Broken, Entertain, War"},
  {name:"Boar",species:"Boar",M:7,WS:35,BS:0,S:33,T:35,I:33,Ag:35,Dex:0,Int:10,WP:10,Fel:0,W:10,
    traits:"Armour 1, Bestial, Horns (Tusks), Night Vision, Skittish, Stride, Weapon+6",
    trained:[], notes:"Can be trained: Broken, Magic, Mount, War"},
  {name:"Cat (Large/Wildcat)",species:"Cat",M:5,WS:30,BS:0,S:15,T:15,I:40,Ag:45,Dex:0,Int:15,WP:20,Fel:0,W:4,
    traits:"Bestial, Night Vision, Size (Small), Stride, Weapon+4, Tracker",
    trained:[], notes:"Stealthy predator. Can be trained: Broken, Fetch, Guard"},
];

export const TRAINED_SKILLS: string[] = [
  "Broken","Drive","Entertain","Fetch","Guard","Home","Magic","Mount","War"
];
