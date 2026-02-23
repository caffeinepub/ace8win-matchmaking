import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Error "mo:core/Error";

import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public type UserProfile = {
    displayName : Text;
    email : Text;
    gamePlayerId : Text;
    gameName : Text;
    phoneNumber : Text;
    refundPaymentQrCode : Storage.ExternalBlob;
  };

  public type Match = {
    id : Text;
    matchType : Text;
    entryFee : Float;
    status : Text;
    participants : [Principal];
    createdAt : Int;
    startTime : Int;
  };

  public type PaymentSubmission = {
    id : Text;
    user : Principal;
    matchId : Text;
    screenshot : Storage.ExternalBlob;
    amountPaid : Float;
    status : Text;
    timestamp : Int;
    approved : Bool;
    refunded : Bool;
    refundTimestamp : ?Int;
  };

  /*------------------------------ CUSTOM ITERATOR ------------------------------*/
  public type CustomIterator<T> = {
    hasNext : () -> Bool;
    next : () -> ?T;
  };

  module IterUtils {
    public func fromArray<T>(array : [T]) : CustomIterator<T> {
      var index = 0;
      {
        hasNext = func() { index < array.size() };
        next = func() {
          if (index < array.size()) {
            let value = array[index];
            index += 1;
            ?value;
          } else {
            null;
          };
        };
      };
    };
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let matches = Map.empty<Text, Match>();
  let payments = Map.empty<Text, PaymentSubmission>();
  let userMatchJoins = Map.empty<Principal, Set.Set<Text>>();

  /*------------------------------ Match Comparison -----------------------------*/
  module Match {
    public func compareByCreatedAt(match1 : Match, match2 : Match) : Order.Order {
      Int.compare(match1.createdAt, match2.createdAt);
    };

    public func filterByStatus(matches : Map.Map<Text, Match>, status : Text) : [Match] {
      matches.filter(func(_id, match) { match.status == status }).values().toArray();
    };
  };

  /*------------------------------ Authorization -------------------------------*/
  public query ({ caller }) func getUserRole() : async ?Text {
    switch (AccessControl.getUserRole(accessControlState, caller)) {
      case (#admin) { ?"admin" };
      case (#user) { ?"user" };
      case (#guest) { ?"guest" };
    };
  };

  /*------------------------------ User Profiles -------------------------------*/
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Users can view any profile according to requirements
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    userProfiles.values().toArray();
  };

  public shared ({ caller }) func updateUserProfile(user : Principal, profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update users");
    };
    userProfiles.add(user, profile);
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove users");
    };
    userProfiles.remove(user);
  };

  /*--------------------------------- Matches ----------------------------------*/
  public shared ({ caller }) func createMatch(id : Text, matchType : Text, entryFee : Float, startTime : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create matches");
    };

    if (matchType != "solo") {
      Runtime.trap("Invalid match type - Only SOLO support for now");
    };

    let match : Match = {
      id;
      matchType;
      entryFee;
      status = "open";
      participants = [];
      createdAt = Time.now();
      startTime;
    };

    matches.add(id, match);
  };

  /*------------------------------- Match Join ---------------------------------*/
  public shared ({ caller }) func joinMatch(matchId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join matches");
    };

    switch (matches.get(matchId)) {
      case (null) { Runtime.trap("Match not found") };
      case (?match) {
        if (match.status != "open") {
          Runtime.trap("Match is not open for joining");
        };

        if (match.participants.size() >= 2) {
          Runtime.trap("Match is already full");
        };

        if (match.participants.any(func(p) { p == caller })) {
          Runtime.trap("User already joined this match");
        };

        let updatedParticipants = match.participants.concat([caller]);
        let updatedStatus = if (updatedParticipants.size() == 2) {
          "full";
        } else {
          match.status;
        };

        let updatedMatch = {
          id = match.id;
          matchType = match.matchType;
          entryFee = match.entryFee;
          status = updatedStatus;
          participants = updatedParticipants;
          createdAt = match.createdAt;
          startTime = match.startTime;
        };
        matches.add(matchId, updatedMatch);

        let userMatches = switch (userMatchJoins.get(caller)) {
          case (null) { Set.fromArray<Text>([]) };
          case (?existing) { existing };
        };
        userMatches.add(matchId);
        userMatchJoins.add(caller, userMatches);
      };
    };
  };

  /*------------------- Book All Remaining Slots (should never be used) -----------------*/
  public shared ({ caller }) func bookAllSlots(matchId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can book slots");
    };

    switch (matches.get(matchId)) {
      case (null) { Runtime.trap("Match not found") };
      case (?match) {
        if (match.status != "open") {
          Runtime.trap("Match is not open for joining");
        };

        if (match.participants.any(func(p) { p == caller })) {
          Runtime.trap("User already joined this match");
        };

        let remainingSlots = 2 - match.participants.size();
        if (remainingSlots <= 0) {
          Runtime.trap("Match is already full");
        };

        let updatedParticipants = match.participants.concat(Array.tabulate(remainingSlots, func(_) { caller }));
        let updatedMatch = {
          id = match.id;
          matchType = match.matchType;
          entryFee = match.entryFee;
          status = "full";
          participants = updatedParticipants;
          createdAt = match.createdAt;
          startTime = match.startTime;
        };
        matches.add(matchId, updatedMatch);

        let userMatches = switch (userMatchJoins.get(caller)) {
          case (null) { Set.fromArray<Text>([]) };
          case (?existing) { existing };
        };
        userMatches.add(matchId);
        userMatchJoins.add(caller, userMatches);
      };
    };
  };

  /*-------------------------------- Payments ----------------------------------*/
  public shared ({ caller }) func submitPayment(
    matchId : Text,
    screenshot : Storage.ExternalBlob,
    amountPaid : Float,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit payments");
    };

    switch (matches.get(matchId)) {
      case (null) { Runtime.trap("Match not found") };
      case (?match) {
        if (not match.participants.any(func(p) { p == caller })) {
          Runtime.trap("User has not joined this match");
        };

        let paymentId = matchId # "_" # caller.toText();
        let payment : PaymentSubmission = {
          id = paymentId;
          user = caller;
          matchId;
          screenshot;
          amountPaid;
          status = "pending";
          timestamp = Time.now();
          approved = false;
          refunded = false;
          refundTimestamp = null;
        };
        payments.add(paymentId, payment);
      };
    };
  };

  public shared ({ caller }) func approvePayment(paymentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve payments");
    };

    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?payment) {
        let updatedPayment = {
          id = payment.id;
          user = payment.user;
          matchId = payment.matchId;
          screenshot = payment.screenshot;
          amountPaid = payment.amountPaid;
          status = "approved";
          timestamp = payment.timestamp;
          approved = true;
          refunded = payment.refunded;
          refundTimestamp = payment.refundTimestamp;
        };
        payments.add(paymentId, updatedPayment);
      };
    };
  };

  public shared ({ caller }) func rejectPayment(paymentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reject payments");
    };

    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?payment) {
        let updatedPayment = {
          id = payment.id;
          user = payment.user;
          matchId = payment.matchId;
          screenshot = payment.screenshot;
          amountPaid = payment.amountPaid;
          status = "rejected";
          timestamp = payment.timestamp;
          approved = false;
          refunded = payment.refunded;
          refundTimestamp = payment.refundTimestamp;
        };
        payments.add(paymentId, updatedPayment);
      };
    };
  };

  public shared ({ caller }) func markAsRefunded(paymentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can mark as refunded");
    };

    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?payment) {
        let updatedPayment = {
          id = payment.id;
          user = payment.user;
          matchId = payment.matchId;
          screenshot = payment.screenshot;
          amountPaid = payment.amountPaid;
          status = payment.status;
          timestamp = payment.timestamp;
          approved = payment.approved;
          refunded = true;
          refundTimestamp = ?Time.now();
        };
        payments.add(paymentId, updatedPayment);
      };
    };
  };

  public query ({ caller }) func getPendingPayments() : async [PaymentSubmission] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view pending payments");
    };
    payments.values().toArray().filter(func(p) { p.status == "pending" });
  };

  public query ({ caller }) func getPaymentStatus(matchId : Text) : async ?PaymentSubmission {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payment status");
    };

    let paymentId = matchId # "_" # caller.toText();
    switch (payments.get(paymentId)) {
      case (null) { null };
      case (?payment) {
        if (payment.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own payment status");
        };
        ?payment;
      };
    };
  };

  public query ({ caller }) func getUserTransactionHistory() : async [PaymentSubmission] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transaction history");
    };

    payments.values().toArray().filter(func(p) { p.user == caller });
  };

  /*------------------------------- Match Queries ------------------------------*/
  public query func getAllMatches() : async [Match] {
    matches.values().toArray().sort(Match.compareByCreatedAt);
  };

  public query func getMatchesByStatus(status : Text) : async [Match] {
    matches.values().toArray().filter(func(m) { m.status == status }).sort(Match.compareByCreatedAt);
  };

  public query ({ caller }) func getUserMatches() : async [Match] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their matches");
    };

    switch (userMatchJoins.get(caller)) {
      case (null) { [] };
      case (?matchIds) {
        matchIds.values().map(
          func(matchId) {
            switch (matches.get(matchId)) {
              case (null) { null };
              case (?match) { ?match };
            };
          }
        ).filter(
          func(optMatch) {
            switch (optMatch) {
              case (null) { false };
              case (?_) { true };
            };
          }
        ).map(
          func(optMatch) {
            switch (optMatch) {
              case (null) { Runtime.trap("Unexpected null match") };
              case (?match) { match };
            };
          }
        ).toArray().sort(Match.compareByCreatedAt);
      };
    };
  };

  public query func getMatchDetails(matchId : Text) : async ?Match {
    matches.get(matchId);
  };

  public query ({ caller }) func getMatchParticipants(matchId : Text) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view match participants");
    };

    switch (matches.get(matchId)) {
      case (null) { [] };
      case (?match) { match.participants };
    };
  };
};
