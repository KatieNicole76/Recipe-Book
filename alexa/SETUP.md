# Recipe Book Alexa skill

Say things like:

- "Alexa, ask Recipe Book to add milk and eggs"
- "Alexa, ask Recipe Book what's on my list"
- "Alexa, open Recipe Book" (then "add bananas")

The skill stays in **development mode**, so it only works for the Amazon account that created it. That
account can use it on the Alexa phone app and on any Echo signed in to it. No Amazon review is needed.

The backend endpoint is `POST /api/alexa/` ([recipes/alexa.py](../recipes/alexa.py)). It checks that each
request was signed by Amazon, was sent recently, and is for this skill, before it touches any data.

## 1. Deploy the backend

Push this code so Railway redeploys. `requirements.txt` now includes `cryptography`, which the endpoint
uses to check Amazon's signatures.

## 2. Create the skill

1. Go to <https://developer.amazon.com/alexa/console/ask>. Sign in with the **same Amazon account** you use
   in the Alexa phone app.
2. Click **Create Skill**.
   - Name: `Recipe Book`, primary locale **English (US)**
   - Experience: **Other** → model **Custom**
   - Hosting: **Provision your own**
   - Template: **Start from scratch**
3. Open **Build → Interaction Model → JSON Editor**. Paste in all of
   [interaction-model.json](interaction-model.json), then click **Save** and **Build skill**.
4. Open **Build → Endpoint**.
   - Choose **HTTPS**.
   - Default Region: `https://<your-railway-backend-domain>/api/alexa/`
   - Certificate: **My development endpoint has a certificate from a trusted certificate authority**
   - Click **Save**.
5. Copy the **Skill ID** from the top of the Endpoint page. It starts with `amzn1.ask.skill.`

## 3. Set Railway variables

On the backend service in Railway, add these and let it redeploy:

| Variable | Value |
|---|---|
| `ALEXA_SKILL_ID` | the Skill ID from step 2.5 |
| `ALEXA_USERNAME` | your Recipe Book username |
| `ALEXA_LIST_NAME` | *(optional)* which shopping list to use. If you leave it out, the skill uses your oldest list. |

Until `ALEXA_SKILL_ID` is set, the endpoint refuses every request.

## 4. Test

1. In the developer console, open the **Test** tab and switch "Skill testing is enabled in" to **Development**.
2. Type `ask recipe book to add milk and eggs`. Alexa should reply "Added milk and eggs to your …", and the
   items should show up in the app.
3. On your phone, open the Alexa app and tap the Alexa button. Say "Ask Recipe Book what's on my list."

If something goes wrong, the Railway logs show a line starting with `Rejected Alexa request:` or
`Alexa request failed` that says why.

## Notes

- **Several items at once:** "milk, eggs and bread" is split into three items on the words "and", "plus" and on
  commas. That also splits things like "mac and cheese", so add those on their own or rename them in the app.
- **Family members:** the skill acts as one user. Letting each person use their own account would need
  Alexa account linking, which means adding OAuth sign-in to the backend.
