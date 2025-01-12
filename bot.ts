import { Bot, Context, session, ConversationFlavor, Conversation, createConversation, conversations } from "./deps.deno.ts";
// Using ES6 imports
import { BrianSDK } from "@brian-ai/sdk";
import { RpcProvider, Account, Contract, json, stark, uint256, shortString } from 'starknet';

export const bot = new Bot(Deno.env.get("BOT_TOKEN") || "");
const SN_RPC_URL = Deno.env.get("SN_RPC_URL") || "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";
const SN_PRIVATE_KEY = Deno.env.get("SN_PRIVATE_KEY") || "";
const SN_ACCOUNT_ADDRESS = Deno.env.get("SN_ACCOUNT_ADDRESS") || "0x06A3a9C81BCB46bF5699bCAc6e3061A294f7D09ddbAe102D42C67e5Ba8d8d7Fd";
const SN_MAIN = "0x534e5f4d41494e";
const SN_SEPOLIA = "0x534e5f5345504f4c4941";
const ETH_SEPOLIA = "11155111";

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

bot.use(createConversation(consultant));
bot.use(createConversation(transact));
bot.use(createConversation(issuance));
bot.use(createConversation(contract));

const options = {
    apiUrlapi: Deno.env.get("BRIAN_API_URL"),
    apiKey: Deno.env.get("BRIAN_API_KEY"),
};



const brian = new BrianSDK(options);

bot.command("consultant", async (ctx: MyContext) => {
    await ctx.conversation.enter("consultant");
});

bot.command("transact", async (ctx: MyContext) => {
    await ctx.conversation.enter("transact");
});

bot.command("issuance", async (ctx: MyContext) => {
    await ctx.conversation.enter("issuance");
});

bot.command("contract", async (ctx: MyContext) => {
    await ctx.conversation.enter("contract");
});

bot.command("help", (ctx) => {
    ctx.reply(`Help Tutorial! 
/consultant - Start a consultation with a AI expert, Please fully understand your behavior before executing a transaction.
/transact -  Execute any transaction you want on Starknet, such as: "swap 10 usdc to eth on starknet", It will exchange your tokens on Avnu.
/issuance - Intelligent coin issuance request, can deploy any protocol contract on Starknet.
/help - Show this help message.
Updated: ${new Date()} ${Date.now()}`)
});


async function consultant(conversation: MyConversation, ctx: MyContext) {
    while (true) {
        await ctx.reply("Please enter your question, such as: Explain uniswap v4 compared to v3?");
        const questionRequest = await conversation.waitFor("message:text");
        const question = questionRequest.message?.text;
        console.log(`${question}`);
        const answer = await brian.ask({
            prompt: `${question}`,
            kb: "public-knowledge-box"
        });
        console.log(`answer: ${answer.answer}`);
        console.log(`answer: ${answer.context}`);
        console.log(`answer: ${answer.input}`);
        ctx.reply(`The AI expert has answered your question: "${answer.answer.substring(0, 500)}...". Do you want to continue the conversation?(yes/no)`);
        const continueConversation = await conversation.waitFor("message:text");
        if (continueConversation.message?.text != "yes") {
            ctx.reply("The session has been terminated, please restart.");
            break;
        }

        new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
}

async function transact(conversation: MyConversation, ctx: MyContext) {
    await ctx.reply("Please enter your trading behavior, such as: Swap 1 strk to usdt");
    const transactContenetRequest = await conversation.waitFor("message:text");
    const requestContent = transactContenetRequest.message?.text;

    const extractRequest = await brian.extract({
        prompt: requestContent,
    });

    console.log("Parameter extraction prompt:", extractRequest.prompt);
    console.log("Parameter extraction completion:", JSON.stringify(extractRequest.completion));

    ctx.reply(`The transaction you are about to execute is: "${JSON.stringify(extractRequest.completion)}". Is that correct?(yes/no)`);

    if ((await conversation.waitFor("message:text")).message?.text != "yes") {
        ctx.reply("The session has been terminated, please restart.");
        return false;
    }

    await ctx.reply("Please enter your Starknet account address.");
    const addressText = await conversation.waitFor("message:text");
    const userAddress = addressText.message?.text;
    await ctx.reply(`Your address is: "${userAddress}". Is this correct?(yes/no)`);
    const addressConfirm = await conversation.waitFor("message:text");
    console.log(`addressConfirm: ${addressConfirm.message?.text}`);
    if (addressConfirm.message?.text != "yes") {
        ctx.reply("The session has been terminated, please restart.");
        return false;
    }
    console.log(`userAddress: ${JSON.stringify(userAddress)}`);

    // transfer 10 usdc to 0x05288402db9a6260a5edfeeb6e5922fd103280e579d103106788a2a33b42fc73 on starknet
    const transactRequest = await brian.transact({
        prompt: `${extractRequest.prompt}  on starknet`,
        address: `${SN_PRIVATE_KEY}`,
        // chainId: SN_SEPOLIA,
    });
    console.log("transaction result:", userAddress); 
    await ctx.reply(`You have completed the transaction is: "${transactRequest[0].data.description}"`);
    await ctx.reply(`If you need to send a new transaction, please re-enter /transact`);
}

async function issuance(conversation: MyConversation, ctx: MyContext) {
    await ctx.reply('Try something like "Deploy an ERC20 named Decision with symbol DA and supply 100000"');
    const deployConentRequest = await conversation.waitFor("message:text");
    const  requestContent = deployConentRequest.message?.text;

    // extract paras
    const extractRequest = await brian.extract({
        prompt: `${requestContent} on starknet`,
    });

    console.log("Parameter extraction prompt:", extractRequest.prompt);
    console.log("Parameter extraction completion:", JSON.stringify(extractRequest.completion));

    ctx.reply(`The transaction you are about to execute is: "${JSON.stringify(extractRequest.completion)}". Is that correct?(yes/no)`);

    if ((await conversation.waitFor("message:text")).message?.text != "yes") {
        ctx.reply("The session has been terminated, please restart.");
        return false;
    }

    // const action = extractRequest.completion[0].action;
    const name = extractRequest.completion[0].name;
    const symbol = extractRequest.completion[0].symbol;
    const supply = extractRequest.completion[0].supply;

    await ctx.reply("Please enter your Starknet account address.");
    const addressText = await conversation.waitFor("message:text");
    const userAddress = addressText.message?.text;
    await ctx.reply(`Your address is: "${userAddress}". Is this correct?(yes/no)`);
    const addressConfirm = await conversation.waitFor("message:text");
    console.log(`addressConfirm: ${addressConfirm.message?.text}`);
    if (addressConfirm.message?.text != "yes") {
        ctx.reply("The session has been terminated, please restart.");
        return false;
    }
    console.log(`userAddress: ${JSON.stringify(userAddress)}`);

    extractRequest.completion[0].owner = userAddress;
    extractRequest.completion[0].uri = "https://";

    console.log("Parameter extraction completion:", JSON.stringify(extractRequest.completion));

    // Deploytoken brian unsupport
    const transactRequest = await brian.transact({
        //  on starknet brian unsupport!
        prompt: `Deploy an ERC20 named ${name} with symbol ${symbol} and supply ${supply} and uri "https://" to address ${userAddress}`,
        address: `${SN_PRIVATE_KEY}`,
        // chainId: "1",
    });
    await ctx.reply(`You have completed the issuance is: "${JSON.stringify(transactRequest)}"`);
    await ctx.reply(`If you need to send a new issuance, please re-enter /issuance`);  
}

async function contract(conversation: MyConversation, ctx: MyContext) {
        await ctx.reply('Try something like "Give me the code of an ERC20 token called DecisionAgent"');
        const ConentCodeRequest = await conversation.waitFor("message:text");
        const  requestContent = ConentCodeRequest.message?.text;
    
        // generate code 
        const generateCodeRequest = await brian.generateCode({
            prompt:  `${requestContent} of Cairo code on starknet`,
            compile: true,
        });
        // ctx.reply(`The code for the ${action} called ${name} is: "${generateCodeRequest.contract}". Do you want to continue with the execution?(yes/no)`);
        console.log("request:", generateCodeRequest.abi);
        console.log("request:", generateCodeRequest.bytecode);
        console.log("request:", generateCodeRequest.contract);
        console.log("request:", generateCodeRequest.standardJsonInput);

        ctx.reply(`${generateCodeRequest.contract}`);
    
        // initialize provider
        const provider = new RpcProvider({ nodeUrl: SN_RPC_URL });
        // initialize existing pre-deployed account 0 of Devnet-rs
        const privateKey = SN_PRIVATE_KEY;
        const accountAddress = SN_ACCOUNT_ADDRESS;
    
        const account0 = new Account(provider, accountAddress, privateKey);
        await ctx.reply('ContractCode over');

        // // Declare & deploy Test contract in SN
        // const compiledTestSierra = json.parse(
        //     fs.readFileSync('./compiledContracts/test.sierra').toString('ascii')
        // );
        // const compiledTestCasm = json.parse(
        //     fs.readFileSync('./compiledContracts/test.casm').toString('ascii')
        // );
        // const deployResponse = await account0.declareAndDeploy({
        //     contract: compiledTestSierra,
        //     casm: compiledTestCasm,
        // });
        
        // // Connect the new contract instance:
        // const myTestContract = new Contract(
        //     compiledTestSierra.abi,
        //     deployResponse.deploy.contract_address,
        //     provider
        // );
        // console.log('Test Contract Class Hash =', deployResponse.declare.class_hash);
        // console.log('✅ Test Contract connected at =', myTestContract.address);  
    
}

