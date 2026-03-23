
export interface ManualSection {
  id: string;
  title: string;
  content: string;
  subsections?: { id: string; title: string; content: string }[];
}

export const MANNUAL_METADATA = {
  company: "Vezloo",
  documentNo: "M/01",
  revisionNo: "01",
  updateDate: "01/01/2020",
  preparedBy: "Manager",
  approvedBy: "Manager",
};

export const MANUAL_CONTENT: ManualSection[] = [
  {
    id: "introduction",
    title: "1. [Company] INTRODUCTION",
    content: "At Vezloo, we are committed to delivering world-class Business Process Outsourcing (BPO) services with a focus on AI data annotation, data labeling, sports analytics, video detection, generative AI support, gaming, and transcription.\n\nThis Quality Policy applies to all services provided by Vezloo and forms the foundation of our Quality Management System (QMS). Our mission is to empower our clients with accurate, high-quality, and timely data solutions that enhance their business performance and technological innovation.",
    subsections: [
      {
        id: "authorization-statement",
        title: "1.1 AUTHORIZATION STATEMENT",
        content: "Vezloo is fully committed to the establishment and maintenance of Quality Management System given in this manual and implemented by the company to meet the requirements of ISO 9001:2015.\n\nThe personnel of the Vezloo shall strictly adhere to the quality policies and procedures as addressed or referred in this manual.\n\nMr. [Manager Name] has been appointed as QMS Team Leader of Vezloo. The QMS Team Leader is responsible for ensuring compliance with the Quality requirements stipulated in this manual. He is authorized to ensure that the quality system is established, implemented and maintained by the Vezloo. Top Management gives full support and co-operation to QMS Team Leader and ensure that all HOD must implement the system."
      },
      {
        id: "organization-structure",
        title: "1.2 ORGANIZATION STRUCTURE",
        content: "The organizational structure of Vezloo is defined to ensure clear lines of authority and communication across all departments. Detailed charts are maintained separately in the QMS files."
      }
    ]
  },
  {
    id: "applicability",
    title: "2. APPLICABILITY",
    content: "This manual applies to all activities, processes, services, and operations performed by Vezloo. The company provides Business Process Outsourcing (BPO) services with specialization in:\n- AI data annotation and data labeling\n- Sports analytics\n- Video detection and analysis\n- Generative AI support\n- Gaming support services\n- Transcription services",
    subsections: [
      {
        id: "scope",
        title: "2.1 SCOPE OF QUALITY MANAGEMENT SYSTEM",
        content: "The scope of certification under ISO 9001:2015 for Vezloo is defined as: “Provision of Business Process Outsourcing (BPO) services including AI data annotation, data labeling, sports analytics, video detection, generative AI support, gaming, and transcription services.”"
      },
      {
        id: "operational-area",
        title: "2.2 OPERATIONAL AREA & PRODUCTION SITE(S)",
        content: "Head Office: Cairo, Egypt\nOperational Sites: [Specify if work is performed remotely]"
      },
      {
        id: "exclusions",
        title: "2.3 PERMISSIBLE EXCLUSION (S)",
        content: "Based on the nature of the organization and its activities, the following requirements of ISO 9001:2015 are not applicable to Vezloo:\n\nClause 8.3 – Design and Development of Products and Services\nJustification: Vezloo provides services based on client specifications and does not engage in the design and development of new products."
      }
    ]
  },
  {
    id: "terms-definitions",
    title: "3. TERMS AND DEFINITIONS",
    content: "Key terms used in this QMS system:\n\n- **QMS**: Quality Management System\n- **Top Management**: Person or group who directs and controls the organization at the highest level.\n- **NCR**: Non-Conformity Report.\n- **CAR**: Corrective Action Report.\n- **Audit**: Systematic, independent and documented process for obtainment of audit evidence.\n- **Risk**: Effect of uncertainty.\n- **Traceability**: Ability to follow the history or location of an object."
  },
  {
    id: "context",
    title: "4. CONTEXT OF ORGANIZATION",
    content: "Vezloo has identified internal and external issues which may affect its ability to achieve intended results of the QMS.",
    subsections: [
      {
        id: "understanding-context",
        title: "4.1 UNDERSTANDING THE ORGANIZATION AND ITS CONTEXT",
        content: "Internal Issues: Infrastructure, IT facilities, employee training.\nExternal Issues: Data security, country-specific regulations (GDPR), technological changes, high competition."
      },
      {
        id: "interested-parties",
        title: "4.2 UNDERSTANDING THE NEEDS AND EXPECTATIONS OF INTERESTED PARTIES",
        content: "Relevant parties include: Customers, Regulators, Employees, Suppliers, and Stakeholders. Their needs are monitored via surveys, contract reviews, and regular meetings."
      },
      {
        id: "determining-scope",
        title: "4.3 DETERMINING THE SCOPE OF THE QUALITY MANAGEMENT SYSTEM",
        content: "The scope has been determined considering external/internal issues, interested parties' requirements, and the products/services provided."
      },
      {
        id: "qms-processes",
        title: "4.4 QUALITY MANAGEMENT SYSTEM AND ITS PROCESSES",
        content: "Vezloo has established, implemented, and maintained the processes needed for the QMS, including their sequence, interaction, inputs, and outputs."
      }
    ]
  },
  {
    id: "leadership",
    title: "5. LEADERSHIP",
    content: "Top Management demonstrates leadership and commitment to the QMS.",
    subsections: [
      {
        id: "leadership-commitment",
        title: "5.1 LEADERSHIP AND COMMITMENT",
        content: "CEO takes accountability for QMS effectiveness, ensures Quality Policy and Objectives are established, and promotes improvement."
      },
      {
        id: "customer-focus",
        title: "5.1.2 CUSTOMER FOCUS",
        content: "Top Management ensures customer requirements/statutory requirements are met and risks to customer satisfaction are addressed."
      },
      {
        id: "policy",
        title: "5.2 POLICY",
        content: "Quality Policy is established and reviewed for suitability and alignment with strategic direction."
      },
      {
        id: "roles-responsibilities",
        title: "5.3 ORGANIZATIONAL ROLES, RESPONSIBILITIES AND AUTHORITIES",
        content: "Authority and responsibility are assigned to ensure the QMS conforms to requirements and processes deliver intended outputs."
      }
    ]
  },
  {
    id: "planning",
    title: "6. PLANNING",
    content: "Planning for the QMS considers risks, opportunities, and quality objectives.",
    subsections: [
      {
        id: "risks-opportunities",
        title: "6.1 ACTIONS TO ADDRESS RISKS AND OPPORTUNITIES",
        content: "Actions are planned to ensure achievement of outcomes, enhance desirable effects, and prevent undesired ones."
      },
      {
        id: "objectives",
        title: "6.2 QUALITY OBJECTIVES AND PLANNING TO ACHIEVE THEM",
        content: "Objectives are established at relevant levels, are measurable, and taken into account applicable requirements."
      },
      {
        id: "planning-changes",
        title: "6.3 PLANNING OF CHANGES",
        content: "Changes to the QMS are carried out in a planned manner to maintain integrity and resource availability."
      }
    ]
  },
  {
    id: "support",
    title: "7. SUPPORT",
    content: "Resources, competence, and documented information needed for the QMS.",
    subsections: [
      {
        id: "resources",
        title: "7.1 RESOURCES",
        content: "Provisions for people, infrastructure, environment for operation, and monitoring/measuring resources."
      },
      {
        id: "competence-awareness",
        title: "7.2 & 7.3 COMPETENCE & AWARENESS",
        content: "Ensuring personal performing work are competent via education/training and aware of the quality policy."
      },
      {
        id: "communication",
        title: "7.4 COMMUNICATION",
        content: "Internal and external communications relevant to the QMS are determined."
      },
      {
        id: "documented-info",
        title: "7.5 DOCUMENTED INFORMATION",
        content: "Creating, updating, and controlling documented information required by the ISO standard and Vezloo's QMS."
      }
    ]
  },
  {
    id: "operation",
    title: "8. OPERATION",
    content: "Planning and control of the processes needed to meet requirements for products and services.",
    subsections: [
      {
        id: "op-planning",
        title: "8.1 OPERATIONAL PLANNING AND CONTROL",
        content: "Establishing criteria for processes and acceptance of products/services."
      },
      {
        id: "req-products",
        title: "8.2 REQUIREMENTS FOR PRODUCTS AND SERVICES",
        content: "Customer communication, determination, and review of requirements."
      },
      {
        id: "control-ext",
        title: "8.4 CONTROL OF EXTERNALLY PROVIDED PROCESSES, PRODUCTS, SERVICES",
        content: "Ensuring external providers conform to requirements."
      },
      {
        id: "production-service",
        title: "8.5 PRODUCTION AND SERVICE PROVISION",
        content: "Controlled conditions for production, identification, traceability, and property belonging to customers."
      },
      {
        id: "release-nonconforming",
        title: "8.6 & 8.7 RELEASE & CONTROL OF NONCONFORMING OUTPUTS",
        content: "Verification of requirements met before release; management of non-conforming outputs."
      }
    ]
  },
  {
    id: "evaluation",
    title: "9. PERFORMANCE EVALUATION",
    content: "Monitoring, measurement, analysis, and evaluation of the QMS.",
    subsections: [
      {
        id: "monitoring-analysis",
        title: "9.1 MONITORING, MEASUREMENT, ANALYSIS AND EVALUATION",
        content: "Determining what needs to be monitored and analyzed to evaluate QMS performance."
      },
      {
        id: "internal-audit",
        title: "9.2 INTERNAL AUDIT",
        content: "Conducting internal audits to provide information on QMS conformity and effectiveness."
      },
      {
        id: "management-review",
        title: "9.3 MANAGEMENT REVIEW",
        content: "Reviewing the organization's QMS to ensure suitcase, adequacy, and effectiveness."
      }
    ]
  },
  {
    id: "improvement",
    title: "10. IMPROVEMENT",
    content: "Determining opportunities for improvement and implementing actions.",
    subsections: [
      {
        id: "nonconformity",
        title: "10.2 NONCONFORMITY AND CORRECTIVE ACTION",
        content: "Reacting to nonconformity and taking action to control, correct, and prevent recurrence."
      },
      {
        id: "continual-improvement",
        title: "10.3 CONTINUAL IMPROVEMENT",
        content: "Continually improving the suitability, adequacy, and effectiveness of the QMS."
      }
    ]
  },
  {
    id: "annex-1",
    title: "ANNEX 1 – QMS POLICY",
    content: "Every concerned employee of Vezloo shall be committed to ensure quality of all products delivered to customers. We strive to act with due attention to quality and comply with legal requirements.\n\nAchieved by:\n- Strict implementation of requirements.\n- Hiring competent personnel.\n- Monitoring practice compliance.\n- Enhancing customer satisfaction."
  },
  {
    id: "annex-3",
    title: "ANNEX 3 – LIST OF PROCEDURES",
    content: "1. Procedure for context of organization\n2. Procedure for Objectives and Targets\n3. Procedure for Monitoring and Measurement\n4. Procedure for Management Review\n5. Procedure for Internal Audit\n6. Procedure for Training, Awareness & Competence\n7. Procedure for Control of Document and Record\n8. Procedure for Correction and Corrective Action\n9. Procedure for Control of Monitoring and Measuring Equipment\n10. Procedure for Purchasing and Subcontracting\n11. Procedure for Change Management\n12. Procedure for Product Withdrawal\n13. Procedure for Control of non-conforming products"
  }
];
