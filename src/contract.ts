import { NearBindgen, near, call, view, LookupMap, NearPromise, UnorderedMap } from "near-sdk-js";
import Decimal from "decimal.js";

const WHITELISTED_ACCOUNTS = ["asac.test.near", "nearnautnft.test.near"]

@NearBindgen({})
class NearTrustIndex {
  accountIndexHistory: LookupMap<string>;
  accountIndexHistoryTimestamp: LookupMap<string>;
  accountIndexHistoryFailures: LookupMap<string>;
  accountResult: UnorderedMap<bigint>;
  testLogs: string[];

  constructor() {
    this.accountIndexHistory = new LookupMap("aih");
    this.accountIndexHistoryTimestamp = new LookupMap("aiht");
    this.accountIndexHistoryFailures = new LookupMap("aihf");
    this.accountResult = new UnorderedMap("ar");
    this.testLogs = [];
  }

  @view({})
  get_temp_logs(): string[] {
    return this.testLogs;
  }

  @call({ payableFunction: true })
  calculate_index({ account_id }: { account_id: string }): NearPromise | void {
    near.log("calculate_index");
    this.testLogs.push("calculate_index");
    // query whitelisted accounts for this account_id using NearPromise
    // ----
    const thirtyTgas = BigInt("30" + "0".repeat(12));
    let callCount = 0;
    let thisContract = Object.keys(WHITELISTED_ACCOUNTS)[0];
    near.log("thisContract: " + thisContract);
    this.testLogs.push("thisContract: " + thisContract);
    const promise = NearPromise.new(thisContract);
    // iterate through WHITELIST[thisContract] values
    for (let i = 0; i < 1; i++) { // only one function for now
      const functionName = "nft_supply_for_owner";
      near.log("functionName: " + functionName);
      this.testLogs.push("functionName: " + functionName);
      promise.functionCall(functionName, JSON.stringify({ account_id: account_id }), BigInt(0), thirtyTgas); // view method
      callCount++;
    }
    // iterate through remaining WHITELIST keys
    for (let i = 1; i < WHITELISTED_ACCOUNTS.length; i++) {
      thisContract = WHITELISTED_ACCOUNTS[i];
      near.log("thisContract: " + thisContract);
      this.testLogs.push("thisContract: " + thisContract);
      if (true) { // if contract has functions, in this case always 1
        near.log("creating promise");
        this.testLogs.push("creating promise");
        let newPromise = NearPromise.new(thisContract);
        // iterate through WHITELIST[thisContract] values
        for (let i = 0; i < 1; i++) { // only one function for now
          const functionName = "nft_supply_for_owner";
          near.log("functionName: " + functionName);
          this.testLogs.push("functionName: " + functionName);
          newPromise.functionCall(functionName, JSON.stringify({ account_id: account_id }), BigInt(0), thirtyTgas); // view method
          callCount++;
        }
        promise.then(newPromise);
        near.log("promise pushed");
        this.testLogs.push("promise pushed");
      }
    }
    near.log("invoking callback");
    this.testLogs.push("invoking callback");
    // call internalCallback
    promise.then(
      NearPromise
        .new(near.currentAccountId())
        .functionCall("internalCallback", JSON.stringify({ accountId: account_id, callCount: callCount }), BigInt(0), thirtyTgas)
    );
    // ----
    return promise.asReturn();
  } 

  @call({ privateFunction: true })
  internalCallback({ accountId, callCount }: { accountId: string; callCount: number }): void {
    near.log("internalCallback");
    this.testLogs.push("internalCallback");
    // loop through all call counts
    this.accountIndexHistoryFailures.set(accountId, "");
    let accountScores: number[] = [];
    // TODO: review this when we have more than 1 function in WHITELIST account functions
    for (let i = 0; i < callCount; i++) {
      let accountFunctions = ["nft_supply_for_owner"];
      for (let j = 0; j < accountFunctions.length; j++) {
        let functionName = accountFunctions[j];
        let mapKey = accountId + ":" + functionName; // nested collections cumbersome: https://docs.near.org/develop/contracts/storage#map
        this.testLogs.push("mapKey: " + mapKey);
        try {
          const promiseResult = near.promiseResult(i);
          try {
            const promiseObject = JSON.parse(promiseResult);
            this.accountResult.set(mapKey, promiseObject);
            const score = 1;
            accountScores.push(score);
          } catch (error) {
            const msg = "Failed saving result from successful promise for id: " + i + " with error message: " + error.message;
            near.log(msg);
            this.accountIndexHistoryFailures.set(mapKey, msg);
          }
        } catch (error) {
          const msg = `Contract Function ${i} threw error`;
          near.log(msg);
          this.accountIndexHistoryFailures.set(mapKey, msg);
        }
      }
    }
    // we save the new scores for every account and timestamp every record
    const timestamp = near.blockTimestamp().toString();
    const accountIndex = new Decimal("1").toFixed(2);
    // we iterate through accountAverageScores
    this.testLogs.push("accountIndex: " + accountIndex);
    this.accountIndexHistory.set(accountId, accountIndex);
    this.accountIndexHistoryTimestamp.set(accountId, timestamp);
  }

}

