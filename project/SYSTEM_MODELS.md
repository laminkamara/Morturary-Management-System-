# Mortuary Management System - System Models

This document provides a comprehensive set of system models for the Mortuary Management System, using [Mermaid](https://mermaid-js.github.io/) diagrams. Each section includes a brief explanation and the Mermaid code for the diagram.

---

## 1. Use Case Diagram

Shows the main actors and their interactions with the system.

```mermaid
usecaseDiagram
  actor Admin
  actor Staff
  actor Pathologist
  actor NextOfKin
  actor System

  Admin -- (Manage Users)
  Admin -- (View Reports)
  Admin -- (Configure System)
  Admin -- (Approve Releases)
  Admin -- (Assign Tasks)
  Admin -- (Assign Autopsies)

  Staff -- (Register Body)
  Staff -- (Update Body Info)
  Staff -- (Request Body Release)
  Staff -- (Perform Tasks)
  Staff -- (View Notifications)

  Pathologist -- (Perform Autopsy)
  Pathologist -- (Upload Autopsy Report)
  Pathologist -- (View Assigned Tasks)
  Pathologist -- (View Notifications)

  NextOfKin -- (Request Body Release)

  System -- (Send Notifications)
  System -- (Auto-logout)
  System -- (Enforce Security)
```

---

## 2. Entity-Relationship Diagram (ERD)

Shows the main entities and their relationships.

```mermaid
erDiagram
  USERS {
    string id PK
    string name
    string email
    string password_hash
    string role
    string phone
    string status
    datetime last_login
  }
  STORAGE_UNITS {
    string id PK
    string name
    string type
    string location
    string temperature
    string status
    string assigned_body_id FK
  }
  BODIES {
    string id PK
    string tag_id
    string full_name
    int age
    string gender
    datetime date_of_death
    datetime intake_time
    string storage_id FK
    string next_of_kin_name
    string next_of_kin_relationship
    string next_of_kin_phone
    string next_of_kin_address
    string status
    string registered_by FK
    string death_certificate
    string notes
  }
  AUTOPSIES {
    string id PK
    string body_id FK
    string pathologist_id FK
    datetime scheduled_date
    string status
    string report_file
    string cause_of_death
    string notes
    string assigned_by FK
    datetime completed_date
  }
  TASKS {
    string id PK
    string title
    string description
    string type
    string assigned_to FK
    string assigned_by FK
    datetime due_date
    string status
    string priority
    string body_id FK
  }
  BODY_RELEASES {
    string id PK
    string body_id FK
    string receiver_name
    string receiver_id
    string relationship
    string requested_by FK
    datetime requested_date
    string status
    string approved_by FK
    datetime approved_date
    string notes
    jsonb documents
  }
  NOTIFICATIONS {
    string id PK
    string title
    string message
    string type
    string user_id FK
    bool is_read
    string action_url
  }

  USERS ||--o{ BODIES : registered_by
  USERS ||--o{ AUTOPSIES : pathologist_id
  USERS ||--o{ AUTOPSIES : assigned_by
  USERS ||--o{ TASKS : assigned_to
  USERS ||--o{ TASKS : assigned_by
  USERS ||--o{ BODY_RELEASES : requested_by
  USERS ||--o{ BODY_RELEASES : approved_by
  USERS ||--o{ NOTIFICATIONS : user_id
  STORAGE_UNITS ||--o{ BODIES : storage_id
  BODIES ||--o{ AUTOPSIES : body_id
  BODIES ||--o{ TASKS : body_id
  BODIES ||--o{ BODY_RELEASES : body_id
```

---

## 3. Data Flow Diagram (DFD)

### Level 0 (Context Diagram)

```mermaid
graph TD
  User[User/Admin/Staff/Pathologist] -->|Login/Register/Request| System[Mortuary Management System]
  System -->|Notifications/Reports| User
  System -->|Email/SMS| ExternalServices[Email/SMS Provider]
  NextOfKin -->|Release Request| System
```

### Level 2 (Body Release Process)

```mermaid
graph TD
  NOK[Next of Kin] -->|Request Release| Staff
  Staff -->|Submit Release Request| System
  System->>Admin: Notify for approval
  Admin->>System: Approve/Reject
  System->>BodiesDB: Update body status
  System->>StorageDB: Update storage status
  System->>NOK: Notify result
```

---

## 4. Class Diagram

```mermaid
classDiagram
  class User {
    +id: string
    +name: string
    +email: string
    +role: string
    +phone: string
    +status: string
    +last_login: Date
    +login()
    +logout()
  }
  class Body {
    +id: string
    +tag_id: string
    +full_name: string
    +age: int
    +gender: string
    +date_of_death: Date
    +intake_time: Date
    +storage_id: string
    +status: string
    +registered_by: string
    +notes: string
    +register()
    +updateInfo()
  }
  class StorageUnit {
    +id: string
    +name: string
    +type: string
    +location: string
    +temperature: string
    +status: string
    +assigned_body_id: string
    +assignBody()
    +releaseBody()
  }
  class Autopsy {
    +id: string
    +body_id: string
    +pathologist_id: string
    +scheduled_date: Date
    +status: string
    +report_file: string
    +cause_of_death: string
    +notes: string
    +assigned_by: string
    +completed_date: Date
    +schedule()
    +complete()
  }
  class Task {
    +id: string
    +title: string
    +description: string
    +type: string
    +assigned_to: string
    +assigned_by: string
    +due_date: Date
    +status: string
    +priority: string
    +body_id: string
    +assign()
    +complete()
  }
  class BodyRelease {
    +id: string
    +body_id: string
    +receiver_name: string
    +receiver_id: string
    +relationship: string
    +requested_by: string
    +requested_date: Date
    +status: string
    +approved_by: string
    +approved_date: Date
    +notes: string
    +approve()
    +reject()
  }
  class Notification {
    +id: string
    +title: string
    +message: string
    +type: string
    +user_id: string
    +is_read: boolean
    +action_url: string
    +send()
    +markRead()
  }

  User "1" -- "*" Body
  User "1" -- "*" Autopsy
  User "1" -- "*" Task
  User "1" -- "*" BodyRelease
  User "1" -- "*" Notification
  Body "1" -- "*" Autopsy
  Body "1" -- "*" Task
  Body "1" -- "*" BodyRelease
  StorageUnit "1" -- "*" Body
```

---

## 5. Component Diagram

```mermaid
componentDiagram
  component WebApp {
    UI
    Auth
    Notification
    Reports
    Settings
  }
  component Backend {
    API
    AuthService
    TaskService
    BodyService
    AutopsyService
    ReleaseService
    NotificationService
    ReportService
    StorageService
    UserService
  }
  component Database
  component Supabase
  component EmailSMSProvider

  WebApp --> Backend
  Backend --> Database
  Backend --> Supabase
  Backend --> EmailSMSProvider
```

---

## 6. Sequence Diagram (Body Release)

```mermaid
sequenceDiagram
  participant NOK as NextOfKin
  participant Staff
  participant Admin
  participant System
  participant StorageDB
  participant BodiesDB

  NOK->>Staff: Request body release
  Staff->>System: Submit release request
  System->>Admin: Notify for approval
  Admin->>System: Approve/Reject
  System->>BodiesDB: Update body status
  System->>StorageDB: Update storage status
  System->>NOK: Notify result
```

---

## 7. Activity Diagram (Autopsy Scheduling)

```mermaid
flowchart TD
  A[Start] --> B[Staff selects body for autopsy]
  B --> C[Assign pathologist]
  C --> D[Schedule date/time]
  D --> E[Save autopsy record]
  E --> F[Notify pathologist]
  F --> G[Pathologist performs autopsy]
  G --> H[Upload report]
  H --> I[Mark autopsy as completed]
  I --> J[End]
```

---

**All diagrams above are in valid Mermaid format and can be rendered in any Mermaid-compatible viewer.** 