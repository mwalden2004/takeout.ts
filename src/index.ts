import fetch from 'isomorphic-unfetch'
import {minify} from 'html-minifier';
import { readFileSync } from 'fs';


/* 
WELCOME TO THE DEPTHS OF HELL, SORRY, I MEANT THE SOURCE FOR TAKEOUT.JS 

Here, you'll find all the questionable, non-TypeScript code that makes your life as a developer 
fairly easy. At least when it comes to sending emails. 
*/

class TakeoutClient {
    debug: boolean;
    token: string;
    baseUrl: string;

    constructor(debug = false) {
        this.debug = debug
        this.token = ''
        this.baseUrl = 'https://takeout.bysourfruit.com'
    }

    /* Mini-docs: 
    *
    * Use this after "const client = new TakeoutClient()"
    * An example is here: 

        client.login('token')

    */

    async login(token: string): Promise<void|{message: string; authenticated: boolean}> {
        this.token = token
        const res = await fetch(`${this.baseUrl}/api/auth/verify`, {
            method: "POST",
            body: JSON.stringify({ token: token }),
            headers: { "Content-Type": "application/json" }
        })

        const response = await res.json()
        if (!res.ok) throw new Error(`Takeout Login Error! ${res.status}`)

        if (res.ok) { if (this.debug == true) { console.log(response.message) } return { message: response.message, authenticated: true } }
    }

    /* Mini-docs: 
    *
    * Use it anywhere. It expects a path, to a file.
    * It returns a string,
    * An example is here: 

        const html = await client.getLocalTemplate('index.html')

    */
    async getHTMLFileContents(file: string): Promise<string> { const backwardsCompatibility = await this.getLocalTemplate(file); return backwardsCompatibility }

    async getLocalTemplate(file: string): Promise<string> {
        if (typeof 'window' === 'undefined') throw new Error('Getting contents from files is not supported in the browser.')
        const fileContent = readFileSync(file).toString()
        const mini = minify(fileContent, { html5: true, continueOnParseError: true });
        return mini
    }


    /* Mini-docs: 
    *
    * Use getCloudTemplate anywhere. It expects the name of a template uploaded to Takeout Cloud.
    * It also expects you to be logged in, so use it with async/await after client.login()
    * It returns a string.
    * An example is here: 

        const html = await client.getCloudTemplate('SomeTemplateInTheCloud.html')

    */

    async getCloudTemplate(file: string): Promise<string> {
        if (file === null) throw new Error("Takeout Cloud Template Error! A template name wasn't provided")
        const res = await fetch(`https://cdn-takeout.bysourfruit.com/cloud/read?name=${file}&token=${this.token}`)
        if (!res.ok) throw new Error(`Takeout Cloud Template Error! ${res.status}`)
        const response = await res.text()
        return response
    }


    /* Mini-docs: 
    *
    * Use it after client.login('token'), via client.send('template'). It expects JSON!  
    * An example is here: 
    
        const template = {
            to: 'takeout@bysourfruit.com',
            from: '',
            subject: 'NPM MODULE TEST',
            // text: '', // you can either send text, or html. You can submit both fields, but HTML will be sent if it does exist.
            html: html,
        }

    * You'll receive an email-ID upon success. Eventually, you can use this ID to view the email in the browser, 
    * at https://takeout.bysourfruit.com/preview/[id]. THIS IS SUPPORTED- NOW!
    */
    async send(emailTemplate: {
        to: string,
        from: string,
        subject: string,
        text?: string,
        replyTo?: string,
        cc?: string,
        html?: string,
    }): Promise<void|{id: string}> {
        if (this.token == null || this.token.trim() === '') throw new Error(`Takeout Send Error! Token was either never provided, login failed, or something similar. Maybe try client.login('YOUR TOKEN')`)
        if (emailTemplate.to === null || emailTemplate.from === null || emailTemplate.subject === null) throw new Error(`Takeout Send Error! One of the required fields to send an email was not fulfilled. Check if your receiver, sender, and subject are defined and passed as an object.`)
        // if (emailTemplate.from.includes(':') || emailTemplate.from.includes('@') || emailTemplate.from.includes('<') || emailTemplate.from.includes('>') || emailTemplate.from.includes(';')) throw new Error(`Takeout Send Error! Your 'from' contains forbidden charcacters. Make sure it doesn't include any of these: :<>@;`)

        const res = await fetch(`${this.baseUrl}/api/email/send`, {
            method: "POST",
            body: JSON.stringify({
                // Required
                sender: emailTemplate.from.trim(),
                receiver: emailTemplate.to.trim(),
                subject: emailTemplate.subject.trim(),

                // Not required, but requested by users
                cc: emailTemplate.cc,
                replyTo: emailTemplate.replyTo,

                // Bodies
                bodyText: emailTemplate.text,
                bodyHTML: emailTemplate.html
            }),
            headers: { "Content-Type": "application/json", "Authorization": `Token ${this.token}` }
        })
        const response = await res.json()
        if (!res.ok) throw new Error(`Takeout Error! ${response['message-id'] + '\n\n'}`)

        if (res.ok) {
            if (this.debug === true) { console.log('Sent email successfully') }
            return { id: response["header"]["message-id"] }
        }
    }


    /* 
    * THIS FEATURE IS IN EARLY ALPHA! 
    * I DOUBT IT WORKS! 
    * YOU CAN TRY USING IT VIA client.verifyEmail('test@test.com')
    * IT RELIES ON THE API. IF THE API CODE IS SCREWED, SO IS THIS BAREBONES FUNCTION!
    */
    async verifyEmail(email: string): Promise<any> {
        if (email === null) throw new Error("Takeout Verify Error! An email wasn't provided")
        const res = await fetch(`${this.baseUrl}/api/email/verify`, {
            method: "POST",
            body: JSON.stringify({
                token: this.token,
                email: email
            }),
            headers: { "Content-Type": "application/json" }
        })
        if (!res.ok) throw new Error(`Takeout Login Error! ${res.status}`)

        const response = await res.json()
        return response.message
    }
}

module.exports = TakeoutClient

