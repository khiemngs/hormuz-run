import { pick } from '../utils/math.js';
import { radio } from '../ui/hud.js';

export const LINES = {
  us: [
    ['USS Vigilant', 'Merchant vessel, stay in the lane. Things are about to get loud.'],
    ['USS Resolute', 'Vampire, vampire! Missiles inbound!'],
    ['USS Mercer', 'Firing for effect. Hope you\'re insured, big guy.'],
    ['Navy Air Boss', 'All units, weapons free on coastal targets.'],
  ],
  iran: [
    ['IRGC Navy', 'All vessels, you are entering a combat zone!'],
    ['Coastal Battery', 'Target the grey ships! ...and whatever that giant one is.'],
    ['IRGC Command', 'Fire everything. Yes, everything.'],
  ],
  crew: [
    ['Chief Engineer', 'She\'s 200,000 tons, Captain. She does NOT turn on a dime!'],
    ['Cook', 'I\'m hiding in the walk-in freezer. Wake me in Oman.'],
    ['Insurance Agent', 'Every container you lose is a very sad email.'],
    ['First Mate', 'Captain, I think they\'re both shooting at us now.'],
  ],
};

export const radioRandom = () => radio(...pick(LINES[pick(['us', 'iran', 'crew'])]));
