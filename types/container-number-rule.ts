export type ContainerNumberRuleRow = {
  id: string;
  sizeCodeId: string;
  sizeCode: string;
  prefix: string;
  serialLength: number;
  startSerial: number;
  endSerial: number;
  currentSerial: number;
  remainingAvailable: number;
  exampleContainerNumber: string;
  remark: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export type ContainerNumberRuleSizeOption = {
  id: string;
  code: string;
  name: string;
};
