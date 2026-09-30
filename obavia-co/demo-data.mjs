/** Fictional authored story data. No inference, legacy confidence or customer records. */
export const DURATION = 40;
export const boundaries = [0, 17, 27, 37];
export const stageAt = (seconds, stageBoundaries = boundaries) => stageBoundaries.reduce((stage, boundary, i) => seconds >= boundary ? i : stage, 0);
export const examples = {
 babe: {
  source: 'A', key: 'Babe Ruth', alternatives: ['LeBron James', 'Tom Brady'],
  quote: 'Some months we’re fine. Other months, we’re waiting for someone to pull a Babe Ruth and save the quarter.',
  highlights: ['Babe Ruth'], evidence: 'Why Babe Ruth?',
  note: 'They contrast good months with waiting for someone to save the quarter. Keep that dependence on one big win alongside the chosen reference; it does not establish a hobby or motive.',
  interpretation: 'Possible need: Consistency', support: 'Some months we’re fine. Other months, we’re waiting for someone to pull a Babe Ruth and save the quarter.',
  chips: ['Babe Ruth Reference', 'Reliance On One Big Win'], response: 'What would a consistent month look like, without needing that home run?',
  generic: 'What is holding sales back?',
  link: 'Their contrast suggests consistency may matter. Ask what a steady month would look like in their terms; their answer can confirm or correct that reading.',
 },
 profit: {
  source: 'B', key: 'profit', alternatives: ['revenue', 'sales'],
  quote: 'We’re bringing in more work, but the profit isn’t moving. Another hire would eat into that profit. We need capacity without losing more profit.',
  highlights: ['profit'], evidence: 'Profit comes up three times.',
  note: 'They return to profit while weighing more capacity against the cost of another hire. Retain that tradeoff, not just the repeated word.',
  interpretation: 'Possible priority: Protect profit while adding capacity', support: 'We’re bringing in more work, but the profit isn’t moving. Another hire would eat into that profit. We need capacity without losing more profit.',
  chips: ['Repeated Profit'], response: 'It sounds like extra capacity has to protect profit. Where is that profit getting squeezed today?',
  generic: 'How could we help you grow revenue?',
  link: 'Three exact uses of profit support a possible priority, not a hidden motive. Reflect the capacity tradeoff tentatively, then give them room to explain or correct it.',
 },
 business: {
  source: 'C', key: 'industry', alternatives: ['company', 'business'],
  quote: 'In our industry, clients expect us to understand their craft. We want to grow, but not lose that depth. That’s what good work in our industry means to me.',
  highlights: ['industry', 'understand their craft', 'not lose that depth'],
  evidence: 'Industry, used twice.',
  note: 'They use industry for the field they work in, and connect good work with understanding clients’ craft. Keep both the term and its context; company would change the referent.',
  interpretation: 'Possible priority: Preserve expertise', support: 'In our industry, clients expect us to understand their craft.',
  chips: ['Industry', 'Depth Of Expertise'], response: 'As you grow in your industry, what expertise is most important to preserve?',
  generic: 'What does your company need?', link: 'Two uses strengthen the observed wording preference. Reuse industry to ask about preserving expertise as they grow, not to infer an emotional motive or personality.',

 },};
export const demoMatch = Object.freeze({value:77,kind:'rubric_match_index',min:0,max:100,synthetic:true,version:'landing_fixture_v1_not_a_production_rubric'});

export const heardMentions = (words, term, timeMs) => words.filter(w => w.text.toLowerCase().replace(/[^a-z]/g, "") === term.toLowerCase() && w.startMs <= timeMs).length;
