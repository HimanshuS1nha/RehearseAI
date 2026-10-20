# Hard ceiling on questions per interview. The graph's decision node checks
# this before asking the LLM, so a model that never decides to finish can't
# run an interview forever.
MAX_QUESTIONS = 50

# Every new account starts with this many interviews.
FREE_INTERVIEW_CREDITS = 1

# Price of one interview in the currency's smallest unit (paise), as Stripe
# expects amounts.
INTERVIEW_PRICE = 100_00
CURRENCY = "inr"

# Upper bound on interviews bought in one checkout.
MAX_INTERVIEWS_PER_PURCHASE = 50
