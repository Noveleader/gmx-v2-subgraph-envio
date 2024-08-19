export interface EventLogItem {
  id: string;
  eventName: string;
  eventNameHash: string;
  msgSender: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: string;
  db_write_timestamp: string;
  eventData_addressItems_arrayItems: string[];
  eventData_addressItems_items: string[];
  eventData_boolItems_arrayItems: string[];
  eventData_boolItems_items: string[];
  eventData_bytes32Items_arrayItems: string[];
  eventData_bytes32Items_items: string[];
  eventData_bytesItems_arrayItems: string[];
  eventData_bytesItems_items: string[];
  eventData_intItems_arrayItems: string[];
  eventData_intItems_items: string[];
  eventData_stringItems_arrayItems: string[];
  eventData_stringItems_items: string[];
  eventData_uintItems_arrayItems: string[];
  eventData_uintItems_items: string[];
}

export interface EventLog1Item {
  id: string;
  eventName: string;
  eventNameHash: string;
  msgSender: string;
  topic1: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: string;
  db_write_timestamp: string;
  eventData_addressItems_arrayItems: string[];
  eventData_addressItems_items: string[];
  eventData_boolItems_arrayItems: string[];
  eventData_boolItems_items: string[];
  eventData_bytes32Items_arrayItems: string[];
  eventData_bytes32Items_items: string[];
  eventData_bytesItems_arrayItems: string[];
  eventData_bytesItems_items: string[];
  eventData_intItems_arrayItems: string[];
  eventData_intItems_items: string[];
  eventData_stringItems_arrayItems: string[];
  eventData_stringItems_items: string[];
  eventData_uintItems_arrayItems: string[];
  eventData_uintItems_items: string[];
}

export interface EventLog2Item {
  id: string;
  eventName: string;
  eventNameHash: string;
  msgSender: string;
  topic1: string;
  topic2: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: string;
  db_write_timestamp: string;
  eventData_addressItems_arrayItems: string[];
  eventData_addressItems_items: string[];
  eventData_boolItems_arrayItems: string[];
  eventData_boolItems_items: string[];
  eventData_bytes32Items_arrayItems: string[];
  eventData_bytes32Items_items: string[];
  eventData_bytesItems_arrayItems: string[];
  eventData_bytesItems_items: string[];
  eventData_intItems_arrayItems: string[];
  eventData_intItems_items: string[];
  eventData_stringItems_arrayItems: string[];
  eventData_stringItems_items: string[];
  eventData_uintItems_arrayItems: string[];
  eventData_uintItems_items: string[];
}
